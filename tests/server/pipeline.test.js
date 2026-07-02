// tests/server/pipeline.test.js
import { describe, it, expect, vi } from 'vitest'
import { runExperiencePipeline } from '../../server/pipeline.js'

const validScene = {
  id: 'windy-door',
  title: 'A Windy Day',
  beats: [
    {
      text: 'The door slammed shut.',
      amplifiedCaption: 'The whole house shuddered',
      duration: 3000,
      narration: 'The door slammed shut.',
      effects: [{ type: 'shake', intensity: 'high', duration: 600 }],
      speech: [{ speaker: 'narrator', text: 'The door slammed shut.', delivery: 'normal' }],
    },
  ],
}

function fakeClient({ stopReason = 'end_turn', text = JSON.stringify(validScene) } = {}) {
  return {
    messages: {
      stream: vi.fn(() => ({
        finalMessage: async () => ({
          stop_reason: stopReason,
          content: [{ type: 'text', text }],
        }),
      })),
    },
  }
}

describe('runExperiencePipeline', () => {
  it('emits status events then the parsed scene', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/jpeg',
      emit,
      client: fakeClient(),
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types[0]).toBe('status')
    expect(types).toContain('scene')
    const sceneEvent = emit.mock.calls.find((c) => c[0].type === 'scene')[0]
    expect(sceneEvent.scene).toEqual(validScene)
  })

  it('sends the image and schema to Claude', async () => {
    const client = fakeClient()
    await runExperiencePipeline({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/png',
      emit: vi.fn(),
      client,
    })
    const params = client.messages.stream.mock.calls[0][0]
    expect(params.model).toBe('claude-opus-4-8')
    expect(params.thinking).toEqual({ type: 'adaptive' })
    expect(params.output_config.format.type).toBe('json_schema')
    const imageBlock = params.messages[0].content.find((b) => b.type === 'image')
    expect(imageBlock.source).toEqual({
      type: 'base64',
      media_type: 'image/png',
      data: 'aGVsbG8=',
    })
  })

  it('throws on refusal instead of emitting a scene', async () => {
    const emit = vi.fn()
    await expect(
      runExperiencePipeline({
        imageBase64: 'aGVsbG8=',
        mediaType: 'image/jpeg',
        emit,
        client: fakeClient({ stopReason: 'refusal', text: '' }),
      }),
    ).rejects.toThrow(/refus/i)
    expect(emit.mock.calls.find((c) => c[0].type === 'scene')).toBeUndefined()
  })
})

// --- Phase B additions ---

function fakeGenAi() {
  return {
    interactions: {
      create: vi.fn(async () => ({ output_image: { data: 'aW1n' } })),
    },
    models: {
      generateVideos: vi.fn(async () => ({
        done: true,
        response: { generatedVideos: [{ video: { name: 'files/x' } }] },
      })),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

describe('runExperiencePipeline — Phase B visuals', () => {
  const base = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' }
  const references = [{ data: 'cmVm', mimeType: 'image/png' }]

  it('skips visual stages gracefully when genAi is unavailable', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({ ...base, emit, client: fakeClient(), genAi: null, references })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('scene')
    expect(types).not.toContain('image')
    expect(types).not.toContain('clip')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('skips visual stages gracefully when no reference images exist', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({ ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references: [] })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).not.toContain('image')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('runs drawing then animating stages and emits images and the film', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const events = emit.mock.calls.map((c) => c[0])
    const stages = events.filter((e) => e.type === 'status').map((e) => e.stage)
    // the film emits its own per-segment 'animating' labels — compare deduped order
    expect([...new Set(stages)]).toEqual(['reading', 'designing', 'drawing', 'animating', 'done'])
    expect(events.filter((e) => e.type === 'image')).toHaveLength(1) // validScene has 1 beat
    expect(events.filter((e) => e.type === 'film')).toHaveLength(1)
    expect(events.filter((e) => e.type === 'clip')).toHaveLength(0)
    // scene must arrive BEFORE drawing starts (frontend shows artifacts progressively)
    expect(events.findIndex((e) => e.type === 'scene'))
      .toBeLessThan(events.findIndex((e) => e.type === 'status' && e.stage === 'drawing'))
  })

  it('still reaches done when film generation fails', async () => {
    const genAi = fakeGenAi()
    genAi.models.generateVideos = vi.fn(async () => { throw new Error('veo down') })
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi, references,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const events = emit.mock.calls.map((c) => c[0])
    expect(events.filter((e) => e.type === 'film')).toHaveLength(0)
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0)
    expect(events.at(-1)).toMatchObject({ type: 'status', stage: 'done' })
  })
})

describe('runExperiencePipeline — Phase C speech and the film', () => {
  const base = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' }
  const references = [{ data: 'cmVm', mimeType: 'image/png' }]
  const voiceConfig = {
    apiKey: 'k',
    voices: { narrator: 'n', 'character-1': 'd1', 'character-2': 'd2' },
  }
  const fakeFetch = () =>
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }))

  it('emits speech events alongside images during drawing', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references,
      voiceConfig, fetchImpl: fakeFetch(),
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('speech')
    expect(types).toContain('image')
    expect(types).toContain('film')
    expect(types).not.toContain('clip')
  })

  it('generates speech even when visuals are unavailable', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: null, references: [],
      voiceConfig, fetchImpl: fakeFetch(), saveDir: '/tmp/generated',
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('speech')
    expect(types).not.toContain('image')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('skips speech gracefully without voiceConfig (existing visual path intact)', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references,
      voiceConfig: null, saveDir: '/tmp/generated', sleep: async () => {},
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).not.toContain('speech')
    expect(types).toContain('image')
  })
})
