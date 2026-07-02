// tests/server/video.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateSceneClip, generateBeatClips } from '../../server/video.js'

function fakeAi({ polls = 2 } = {}) {
  let remaining = polls
  const finished = {
    done: true,
    response: { generatedVideos: [{ video: { name: 'files/abc' } }] },
  }
  return {
    models: {
      generateVideos: vi.fn(async () =>
        remaining === 0 ? finished : { done: false },
      ),
    },
    operations: {
      getVideosOperation: vi.fn(async () => {
        remaining -= 1
        return remaining <= 0 ? finished : { done: false }
      }),
    },
    files: {
      download: vi.fn(async () => {}),
    },
  }
}

describe('generateSceneClip', () => {
  it('polls until done, downloads, and emits a media URL', async () => {
    const ai = fakeAi({ polls: 2 })
    const emit = vi.fn()
    const sleep = vi.fn(async () => {})
    const url = await generateSceneClip({
      imageBase64: 'aW1n',
      prompt: 'door slams',
      emit,
      ai,
      saveDir: '/tmp/generated',
      sleep,
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalled()
    expect(ai.files.download).toHaveBeenCalledOnce()
    const { downloadPath } = ai.files.download.mock.calls[0][0]
    expect(downloadPath.startsWith('/tmp/generated/')).toBe(true)
    expect(url).toMatch(/^\/api\/media\/clip-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'clip', url })
  })

  it('sends the hero image and fast model with audio-capable config', async () => {
    const ai = fakeAi({ polls: 0 })
    await generateSceneClip({
      imageBase64: 'aW1n',
      prompt: 'door slams',
      emit: vi.fn(),
      ai,
      saveDir: '/tmp/generated',
      sleep: async () => {},
    })
    const params = ai.models.generateVideos.mock.calls[0][0]
    expect(params.model).toBe('veo-3.1-fast-generate-preview')
    expect(params.image).toEqual({ imageBytes: 'aW1n', mimeType: 'image/png' })
    expect(params.config).toEqual({
      durationSeconds: 8, // number — the API rejects string values
      resolution: '720p',
      aspectRatio: '16:9',
    })
  })
})

describe('generateBeatClips', () => {
  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'A', amplifiedCaption: 'wind', duration: 3000, effects: [] },
      { text: 'B', amplifiedCaption: 'slam', duration: 3000, effects: [] },
    ],
  }
  const images = [
    { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
    { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
  ]

  it('generates one clip per image in parallel and emits indexed clip events', async () => {
    const ai = fakeAi({ polls: 0 })
    const emit = vi.fn()
    const clips = await generateBeatClips({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(clips).toHaveLength(2)
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(2)
    // correct mime passed through from the data URL
    expect(ai.models.generateVideos.mock.calls[0][0].image.mimeType).toBe('image/jpeg')
    const events = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'clip')
    expect(events.map((e) => e.index).sort()).toEqual([0, 1])
    expect(events[0].url).toMatch(/^\/api\/media\/clip-.+\.mp4$/)
  })

  it('tolerates one failed clip and still returns the rest', async () => {
    const ai = fakeAi({ polls: 0 })
    let call = 0
    const original = ai.models.generateVideos
    ai.models.generateVideos = vi.fn(async (params) => {
      if (call++ === 0) throw new Error('veo down')
      return original(params)
    })
    const emit = vi.fn()
    const clips = await generateBeatClips({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(clips).toHaveLength(1)
  })

  it('bounds clip concurrency to 2 in flight', async () => {
    const fourImages = [
      { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
      { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
      { index: 2, src: 'data:image/jpeg;base64,aW1nMg==' },
      { index: 3, src: 'data:image/jpeg;base64,aW1nMw==' },
    ]
    const fourBeatScene = {
      id: 's', title: 't',
      beats: [
        { text: 'A', amplifiedCaption: 'wind', duration: 3000, effects: [] },
        { text: 'B', amplifiedCaption: 'slam', duration: 3000, effects: [] },
        { text: 'C', amplifiedCaption: 'rain', duration: 3000, effects: [] },
        { text: 'D', amplifiedCaption: 'thunder', duration: 3000, effects: [] },
      ],
    }
    let inFlight = 0
    let maxInFlight = 0
    const ai = {
      models: {
        generateVideos: vi.fn(async () => {
          inFlight += 1
          maxInFlight = Math.max(maxInFlight, inFlight)
          await new Promise((resolve) => setTimeout(resolve, 0))
          inFlight -= 1
          return {
            done: true,
            response: { generatedVideos: [{ video: { name: 'files/abc' } }] },
          }
        }),
      },
      operations: { getVideosOperation: vi.fn(async () => ({ done: true })) },
      files: { download: vi.fn(async () => {}) },
    }
    const clips = await generateBeatClips({
      scene: fourBeatScene, images: fourImages, emit: vi.fn(), ai,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(clips).toHaveLength(4)
    expect(maxInFlight).toBeLessThanOrEqual(2)
  })
})
