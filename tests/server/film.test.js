// tests/server/film.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateFilm, pickKeyBeat } from '../../server/film.js'

const scene = {
  id: 's', title: 't', keyBeatIndex: 1,
  beats: [
    { text: 'A', amplifiedCaption: 'wind rose', duration: 3000, effects: [] },
    { text: 'B', amplifiedCaption: 'door slammed', duration: 3000,
      motionPrompt: 'the door swings shut, dust drifts in the doorway light',
      effects: [{ type: 'shake', intensity: 'high', duration: 600 }] },
    { text: 'C', amplifiedCaption: 'silence fell', duration: 3000, effects: [] },
  ],
}
const images = [
  { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
  { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
]

function fakeAi() {
  return {
    models: {
      generateVideos: vi.fn(async () => ({
        done: true,
        response: { generatedVideos: [{ video: { name: 'files/v0' } }] },
      })),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

describe('pickKeyBeat', () => {
  it('uses keyBeatIndex when it has an illustration', () => {
    expect(pickKeyBeat(scene, images)).toBe(1)
  })

  it('falls back to a high-shake illustrated beat when keyBeatIndex has no image', () => {
    const s = { ...scene, keyBeatIndex: 2 } // beat 2 has no image
    expect(pickKeyBeat(s, images)).toBe(1) // beat 1 has high shake + image
  })

  it('falls back to the first illustration otherwise', () => {
    const s = { ...scene, keyBeatIndex: 2, beats: scene.beats.map((b) => ({ ...b, effects: [] })) }
    expect(pickKeyBeat(s, images)).toBe(0)
  })

  it('returns -1 without images', () => {
    expect(pickKeyBeat(scene, [])).toBe(-1)
  })
})

describe('generateFilm', () => {
  it('films ONLY the key beat from its illustration and emits an indexed film event', async () => {
    const ai = fakeAi()
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(1)
    const params = ai.models.generateVideos.mock.calls[0][0]
    // Lite is the primary model — its quota pool is the one we actually have
    expect(params.model).toBe('veo-3.1-lite-generate-preview')
    expect(params.image).toEqual({ imageBytes: 'aW1nMQ==', mimeType: 'image/jpeg' })
    // Claude's constrained motion design drives the animation, not the dramatic caption
    expect(params.prompt).toContain('the door swings shut')
    expect(params.prompt).toContain('Nothing new may enter the frame')
    expect(params.config).toMatchObject({
      durationSeconds: 8, resolution: '720p', aspectRatio: '16:9',
    })
    // lite rejects negativePrompt with a 400 — it must be omitted there
    expect(params.config.negativePrompt).toBeUndefined()
    expect(ai.files.download).toHaveBeenCalledOnce()
    expect(url).toMatch(/^\/api\/media\/film-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'film', url, index: 1 })
  })

  it('emits a single filming status label', async () => {
    const emit = vi.fn()
    await generateFilm({
      scene, images, emit, ai: fakeAi(), saveDir: '/tmp/generated', sleep: async () => {},
    })
    const statuses = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'status')
    expect(statuses).toEqual([
      { type: 'status', stage: 'animating', label: 'Filming the key scene...' },
    ])
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
    await generateFilm({
      scene, images, emit: vi.fn(), ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
  })

  it('throws a diagnosable error when the operation carries no video', async () => {
    const ai = fakeAi()
    ai.models.generateVideos = vi.fn(async () => ({
      done: true,
      error: { message: 'operation failed upstream' },
    }))
    await expect(
      generateFilm({ scene, images, emit: vi.fn(), ai, saveDir: '/tmp/generated' }),
    ).rejects.toThrow('operation failed upstream')
  })

  it('falls back to the fast model when the lite model hits its quota', async () => {
    const ai = fakeAi()
    const original = ai.models.generateVideos.getMockImplementation()
    ai.models.generateVideos = vi.fn(async (params) => {
      if (params.model === 'veo-3.1-lite-generate-preview') {
        throw new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}')
      }
      return original(params)
    })
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(2)
    const fastParams = ai.models.generateVideos.mock.calls[1][0]
    expect(fastParams.model).toBe('veo-3.1-fast-generate-preview')
    // fast supports negativePrompt — the hallucination blocklist rides along
    expect(fastParams.config.negativePrompt).toContain('structures materializing')
    expect(url).toMatch(/^\/api\/media\/film-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'film', url, index: 1 })
  })

  it('does not fall back on non-quota errors', async () => {
    const ai = fakeAi()
    ai.models.generateVideos = vi.fn(async () => {
      throw new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}')
    })
    await expect(
      generateFilm({ scene, images, emit: vi.fn(), ai, saveDir: '/tmp/generated' }),
    ).rejects.toThrow('INVALID_ARGUMENT')
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(1)
  })
})
