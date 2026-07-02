// tests/server/pipeline.test.js
import { describe, it, expect, vi } from 'vitest'
import { runExperiencePipeline } from '../../server/pipeline.js'

const validScene = {
  id: 'windy-door',
  title: 'A Windy Day',
  beats: [
    { text: 'The door slammed shut.' },
    { text: 'Everything went quiet.' },
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
  it('emits reading status, the parsed scene, then done', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/jpeg',
      emit,
      client: fakeClient(),
    })
    const events = emit.mock.calls.map((c) => c[0])
    expect(events[0]).toMatchObject({ type: 'status', stage: 'reading' })
    const sceneEvent = events.find((e) => e.type === 'scene')
    expect(sceneEvent.scene).toEqual(validScene)
    expect(events.at(-1)).toMatchObject({ type: 'status', stage: 'done' })
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
