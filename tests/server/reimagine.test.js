// tests/server/reimagine.test.js
import { describe, it, expect, vi } from 'vitest'
import { reimaginePassage } from '../../server/reimagine.js'

const references = [
  { data: 'cmVmMQ==', mimeType: 'image/png' },
  { data: 'cmVmMg==', mimeType: 'image/png' },
]

function fakeClient({
  label = '1800s Joseon Korea',
  illustrationPrompt = 'hanok rooftops at dusk',
} = {}) {
  return {
    messages: {
      stream: vi.fn(() => ({
        finalMessage: async () => ({
          stop_reason: 'end_turn',
          content: [{ type: 'text', text: JSON.stringify({ label, illustrationPrompt }) }],
        }),
      })),
    },
  }
}

function fakeAi({ failOn = null } = {}) {
  return {
    interactions: {
      create: vi.fn(async (params) => {
        if (failOn && params.model === failOn) throw new Error('model down')
        return { output_image: { data: '/9j/abc' } }
      }),
    },
  }
}

describe('reimaginePassage', () => {
  it('asks Claude to structure the wish with the passage and wish verbatim', async () => {
    const client = fakeClient()
    const ai = fakeAi()
    await reimaginePassage({
      text: 'The door slammed shut.',
      sceneTitle: 'A Windy Day',
      wish: '1800년대 조선시대',
      client,
      ai,
      references,
    })
    const params = client.messages.stream.mock.calls[0][0]
    expect(params.model).toBe('claude-opus-4-8')
    expect(params.thinking).toEqual({ type: 'adaptive' })
    expect(params.output_config.format.type).toBe('json_schema')
    const userContent = params.messages[0].content
    expect(userContent).toContain('The door slammed shut.')
    expect(userContent).toContain('1800년대 조선시대')
  })

  it('renders with Nano Banana Pro first, prompt grounded in label and passage', async () => {
    const client = fakeClient()
    const ai = fakeAi()
    await reimaginePassage({
      text: 'The door slammed shut.',
      sceneTitle: 'A Windy Day',
      wish: '1800년대 조선시대',
      client,
      ai,
      references,
    })
    const params = ai.interactions.create.mock.calls[0][0]
    expect(params.model).toBe('gemini-3-pro-image')
    const promptText = params.input.find((p) => p.type === 'text').text
    expect(promptText).toContain('1800s Joseon Korea')
    expect(promptText).toContain('The door slammed shut.')
    expect(promptText).toContain('Keep EXACTLY the reference art style')
  })

  it('returns a label and a JPEG data URL sniffed from the response bytes', async () => {
    const client = fakeClient()
    const ai = fakeAi()
    const result = await reimaginePassage({
      text: 'The door slammed shut.',
      sceneTitle: 'A Windy Day',
      wish: '1800년대 조선시대',
      client,
      ai,
      references,
    })
    expect(result.label).toBe('1800s Joseon Korea')
    expect(result.src.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('falls back to the Lite model when the Pro call fails', async () => {
    const client = fakeClient()
    const ai = fakeAi({ failOn: 'gemini-3-pro-image' })
    const result = await reimaginePassage({
      text: 'The door slammed shut.',
      sceneTitle: 'A Windy Day',
      wish: '1800년대 조선시대',
      client,
      ai,
      references,
    })
    const models = ai.interactions.create.mock.calls.map((c) => c[0].model)
    expect(models).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-lite-image'])
    expect(result.src.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('throws when image generation is unavailable (ai is null)', async () => {
    const client = fakeClient()
    await expect(
      reimaginePassage({
        text: 'The door slammed shut.',
        sceneTitle: 'A Windy Day',
        wish: '1800년대 조선시대',
        client,
        ai: null,
        references,
      }),
    ).rejects.toThrow(/unavailable/i)
  })
})
