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
    expect(types[types.length - 1]).toBe('scene')
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
