// tests/server/film.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateFilm } from '../../server/film.js'

const scene = {
  id: 's', title: 't',
  beats: [
    { text: 'A', amplifiedCaption: 'wind rose', duration: 3000, effects: [] },
    { text: 'B', amplifiedCaption: 'door slammed', duration: 3000, effects: [] },
    { text: 'C', amplifiedCaption: 'silence fell', duration: 3000, effects: [] },
  ],
}
const images = [
  { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
  { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
]

function fakeAi() {
  let gen = 0
  return {
    models: {
      generateVideos: vi.fn(async () => ({
        done: true,
        response: { generatedVideos: [{ video: { name: `files/v${gen++}` } }] },
      })),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

describe('generateFilm', () => {
  it('chains one initial segment plus one extension per remaining beat', async () => {
    const ai = fakeAi()
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    // 3 beats => 1 image-to-video + 2 extensions
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(3)
    const calls = ai.models.generateVideos.mock.calls.map((c) => c[0])
    // first call: from the beat-0 illustration
    expect(calls[0].image).toEqual({ imageBytes: 'aW1nMA==', mimeType: 'image/jpeg' })
    expect(calls[0].config.durationSeconds).toBe(8)
    expect(calls[0].prompt).toContain('wind rose')
    // extensions: chain the PREVIOUS generation's video object, no image
    expect(calls[1].video).toEqual({ name: 'files/v0' })
    expect(calls[1].image).toBeUndefined()
    expect(calls[1].prompt).toContain('door slammed')
    expect(calls[1].config).toEqual({ numberOfVideos: 1, resolution: '720p' })
    expect(calls[2].video).toEqual({ name: 'files/v1' })
    // only the FINAL combined video is downloaded
    expect(ai.files.download).toHaveBeenCalledOnce()
    expect(ai.files.download.mock.calls[0][0].file).toEqual({ name: 'files/v2' })
    expect(url).toMatch(/^\/api\/media\/film-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'film', url })
  })

  it('emits per-segment progress labels on the animating stage', async () => {
    const emit = vi.fn()
    await generateFilm({
      scene, images, emit, ai: fakeAi(), saveDir: '/tmp/generated', sleep: async () => {},
    })
    const statusEvents = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'status')
    expect(statusEvents.map((e) => e.label)).toEqual([
      'Filming scene 1/3...',
      'Filming scene 2/3...',
      'Filming scene 3/3...',
    ])
    for (const e of statusEvents) {
      expect(e.stage).toBe('animating')
    }
  })

  it('returns null without images', async () => {
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images: [], emit, ai: fakeAi(), saveDir: '/tmp/generated',
    })
    expect(url).toBeNull()
    expect(emit).not.toHaveBeenCalled()
  })

  it('polls pending operations until done', async () => {
    const ai = fakeAi()
    let polls = 2
    const pending = { done: false }
    const finished = {
      done: true,
      response: { generatedVideos: [{ video: { name: 'files/vX' } }] },
    }
    ai.models.generateVideos = vi.fn(async () => pending)
    ai.operations.getVideosOperation = vi.fn(async () => (--polls <= 0 ? finished : pending))
    const oneBeat = { ...scene, beats: [scene.beats[0]] }
    await generateFilm({
      scene: oneBeat, images, emit: vi.fn(), ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
  })
})
