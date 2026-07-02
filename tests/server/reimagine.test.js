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
  motionPrompt = 'lantern light flickers, her hanbok sways as she steps back',
} = {}) {
  return {
    messages: {
      stream: vi.fn(() => ({
        finalMessage: async () => ({
          stop_reason: 'end_turn',
          content: [
            { type: 'text', text: JSON.stringify({ label, illustrationPrompt, motionPrompt }) },
          ],
        }),
      })),
    },
  }
}

function fakeAi({ failOn = null, veoFail = null } = {}) {
  let gen = 0
  return {
    interactions: {
      create: vi.fn(async (params) => {
        if (failOn && params.model === failOn) throw new Error('model down')
        return { output_image: { data: '/9j/abc' } }
      }),
    },
    models: {
      generateVideos: vi.fn(async (params) => {
        if (veoFail === 'always') throw new Error('veo down')
        if (veoFail === 'quota' && params.model === 'veo-3.1-lite-generate-preview') {
          throw new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}')
        }
        return {
          done: true,
          response: { generatedVideos: [{ video: { name: `files/v${gen++}` } }] },
        }
      }),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

const base = {
  text: 'The door slammed shut.',
  sceneTitle: 'A Windy Day',
  wish: '1800년대 조선시대',
  saveDir: '/tmp/generated',
  sleep: async () => {},
}

describe('reimaginePassage', () => {
  it('asks Claude to structure the wish with the passage and wish verbatim', async () => {
    const client = fakeClient()
    await reimaginePassage({ ...base, emit: vi.fn(), client, ai: fakeAi(), references })
    const params = client.messages.stream.mock.calls[0][0]
    expect(params.model).toBe('claude-opus-4-8')
    expect(params.thinking).toEqual({ type: 'adaptive' })
    expect(params.output_config.format.type).toBe('json_schema')
    expect(params.output_config.format.schema.required).toContain('motionPrompt')
    const userContent = params.messages[0].content
    expect(userContent).toContain('The door slammed shut.')
    expect(userContent).toContain('1800년대 조선시대')
  })

  it('emits the still (Pro-rendered, JPEG-sniffed) then the animated clip', async () => {
    const emit = vi.fn()
    const ai = fakeAi()
    await reimaginePassage({ ...base, emit, client: fakeClient(), ai, references })

    const imageParams = ai.interactions.create.mock.calls[0][0]
    expect(imageParams.model).toBe('gemini-3-pro-image')
    const promptText = imageParams.input.find((p) => p.type === 'text').text
    expect(promptText).toContain('1800s Joseon Korea')
    expect(promptText).toContain('The door slammed shut.')
    expect(promptText).toContain('Keep EXACTLY the reference art style')

    const events = emit.mock.calls.map((c) => c[0])
    expect(events[0].type).toBe('image')
    expect(events[0].label).toBe('1800s Joseon Korea')
    expect(events[0].src.startsWith('data:image/jpeg;base64,')).toBe(true)
    expect(events[1].type).toBe('clip')
    expect(events[1].url).toMatch(/^\/api\/media\/remix-.+\.mp4$/)
  })

  it('animates with the lite model using the motion choreography and closed-frame rules', async () => {
    const ai = fakeAi()
    await reimaginePassage({ ...base, emit: vi.fn(), client: fakeClient(), ai, references })
    const veoParams = ai.models.generateVideos.mock.calls[0][0]
    expect(veoParams.model).toBe('veo-3.1-lite-generate-preview')
    expect(veoParams.config).toMatchObject({
      durationSeconds: 8, resolution: '720p', aspectRatio: '16:9',
    })
    expect(veoParams.config.negativePrompt).toBeUndefined() // lite rejects it
    expect(veoParams.prompt).toContain('lantern light flickers')
    expect(veoParams.prompt).toContain('Nothing new may enter the frame')
    expect(veoParams.image.mimeType).toBe('image/jpeg')
  })

  it('falls back to the fast model (with negativePrompt) on lite quota errors', async () => {
    const emit = vi.fn()
    const ai = fakeAi({ veoFail: 'quota' })
    await reimaginePassage({ ...base, emit, client: fakeClient(), ai, references })
    const fastParams = ai.models.generateVideos.mock.calls[1][0]
    expect(fastParams.model).toBe('veo-3.1-fast-generate-preview')
    expect(fastParams.config.negativePrompt).toContain('structures materializing')
    expect(emit.mock.calls.map((c) => c[0].type)).toContain('clip')
  })

  it('keeps the still card when the clip fails (non-fatal)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const emit = vi.fn()
      await reimaginePassage({
        ...base, emit, client: fakeClient(), ai: fakeAi({ veoFail: 'always' }), references,
      })
      const types = emit.mock.calls.map((c) => c[0].type)
      expect(types).toContain('image')
      expect(types).not.toContain('clip')
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('falls back to the Lite image model when the Pro call fails', async () => {
    const emit = vi.fn()
    const ai = fakeAi({ failOn: 'gemini-3-pro-image' })
    await reimaginePassage({ ...base, emit, client: fakeClient(), ai, references })
    const models = ai.interactions.create.mock.calls.map((c) => c[0].model)
    expect(models).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-lite-image'])
  })

  it('throws when image generation is unavailable (ai is null)', async () => {
    await expect(
      reimaginePassage({ ...base, emit: vi.fn(), client: fakeClient(), ai: null, references }),
    ).rejects.toThrow(/unavailable/i)
  })
})
