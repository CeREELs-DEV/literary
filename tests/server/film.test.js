// tests/server/film.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateImaginingFilms } from '../../server/film.js'

const scene = {
  id: 's', title: 't', keyBeatIndex: 1,
  beats: [
    { text: 'A', amplifiedCaption: 'wind rose', duration: 3000, effects: [] },
    { text: 'The door slammed shut.', amplifiedCaption: 'door slammed', duration: 3000,
      effects: [{ type: 'shake', intensity: 'high', duration: 600 }] },
  ],
  imaginings: [
    { title: 'Through her eyes', perspective: 'from the fleeing girl',
      illustrationPrompt: 'low angle close-up', motionPrompt: 'she sprints away, looking back' },
    { title: 'From the rafters', perspective: 'from a mouse high above',
      illustrationPrompt: 'tiny figures far below', motionPrompt: 'the tiny door swings shut' },
    { title: 'Outside the window', perspective: 'from the silent yard',
      illustrationPrompt: 'distant silhouette', motionPrompt: 'the window light flickers' },
  ],
}
const imaginingImages = [
  { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
  { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
  { index: 2, src: 'data:image/jpeg;base64,aW1nMg==' },
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

describe('generateImaginingFilms', () => {
  it('films each imagining sequentially and emits indexed film events', async () => {
    const ai = fakeAi()
    const emit = vi.fn()
    const films = await generateImaginingFilms({
      scene, imaginingImages, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(films).toHaveLength(3)
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(3)
    const calls = ai.models.generateVideos.mock.calls.map((c) => c[0])
    // lite is the primary model everywhere; no negativePrompt on lite
    for (const params of calls) {
      expect(params.model).toBe('veo-3.1-lite-generate-preview')
      expect(params.config.negativePrompt).toBeUndefined()
    }
    // story context + this imagining's perspective + its choreography
    expect(calls[0].prompt).toContain('The door slammed shut.')
    expect(calls[0].prompt).toContain('from the fleeing girl')
    expect(calls[0].prompt).toContain('she sprints away, looking back')
    expect(calls[0].prompt).toContain('Nothing new may enter the frame')
    expect(calls[1].image.imageBytes).toBe('aW1nMQ==')
    const filmEvents = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'imagining-film')
    expect(filmEvents.map((e) => e.index)).toEqual([0, 1, 2])
    const labels = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'status')
      .map((e) => e.label)
    expect(labels).toEqual([
      'Filming imagination 1/3...',
      'Filming imagination 2/3...',
      'Filming imagination 3/3...',
    ])
  })

  it('skips a failed imagining and keeps filming the rest', async () => {
    const ai = fakeAi()
    const original = ai.models.generateVideos.getMockImplementation()
    let call = 0
    ai.models.generateVideos = vi.fn(async (params) => {
      if (call++ === 1) throw new Error('{"error":{"code":400,"status":"INVALID_ARGUMENT"}}')
      return original(params)
    })
    const emit = vi.fn()
    const films = await generateImaginingFilms({
      scene, imaginingImages, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(films.map((f) => f.index)).toEqual([0, 2])
  })

  it('skips imaginings without an illustration', async () => {
    const ai = fakeAi()
    const films = await generateImaginingFilms({
      scene, imaginingImages: [imaginingImages[1]], emit: vi.fn(), ai,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(films.map((f) => f.index)).toEqual([1])
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(1)
  })

  it('falls back to the fast model (with negativePrompt) on lite quota errors', async () => {
    const ai = fakeAi()
    const original = ai.models.generateVideos.getMockImplementation()
    ai.models.generateVideos = vi.fn(async (params) => {
      if (params.model === 'veo-3.1-lite-generate-preview') {
        throw new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}')
      }
      return original(params)
    })
    const films = await generateImaginingFilms({
      scene, imaginingImages: [imaginingImages[0]], emit: vi.fn(), ai,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(films).toHaveLength(1)
    const fastParams = ai.models.generateVideos.mock.calls[1][0]
    expect(fastParams.model).toBe('veo-3.1-fast-generate-preview')
    expect(fastParams.config.negativePrompt).toContain('structures materializing')
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
    await generateImaginingFilms({
      scene, imaginingImages: [imaginingImages[0]], emit: vi.fn(), ai,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
  })

  it('returns [] without imaginings or images', async () => {
    const bare = { ...scene, imaginings: [] }
    expect(await generateImaginingFilms({
      scene: bare, imaginingImages, emit: vi.fn(), ai: fakeAi(), saveDir: '/tmp',
    })).toEqual([])
    expect(await generateImaginingFilms({
      scene, imaginingImages: [], emit: vi.fn(), ai: fakeAi(), saveDir: '/tmp',
    })).toEqual([])
  })
})
