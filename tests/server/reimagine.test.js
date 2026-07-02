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

function fakeAi({ failOn = null, veoFail = null, veoQuotaModels = [] } = {}) {
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
        if (veoQuotaModels.includes(params.model)) {
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
  bookText:
    'The wind blew fiercely. The door slammed shut. And then, everything fell silent.',
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

  it('gives every generation step the full book text as story context', async () => {
    const client = fakeClient()
    const ai = fakeAi()
    await reimaginePassage({ ...base, emit: vi.fn(), client, ai, references })
    // Claude sees the whole book, not just the selected passage
    const userContent = client.messages.stream.mock.calls[0][0].messages[0].content
    expect(userContent).toContain('The wind blew fiercely.')
    // ...and so do the still and the clip prompts
    const stillPrompt = ai.interactions.create.mock.calls[0][0].input.find(
      (p) => p.type === 'text',
    ).text
    expect(stillPrompt).toContain('The wind blew fiercely.')
    const clipPrompt = ai.models.generateVideos.mock.calls[0][0].prompt
    expect(clipPrompt).toContain('The wind blew fiercely.')
  })

  it('injects the book bible into the design and still prompts by default', async () => {
    const client = fakeClient()
    const ai = fakeAi()
    await reimaginePassage({ ...base, emit: vi.fn(), client, ai, references })
    const userContent = client.messages.stream.mock.calls[0][0].messages[0].content
    expect(userContent).toContain('Midnight Gulch') // from the default BOOK_CONTEXT
    const stillPrompt = ai.interactions.create.mock.calls[0][0].input.find(
      (p) => p.type === 'text',
    ).text
    expect(stillPrompt).toContain('Midnight Gulch')
  })

  it('accepts a custom book bible', async () => {
    const client = fakeClient()
    await reimaginePassage({
      ...base, bookContext: 'CUSTOM BIBLE FACTS', emit: vi.fn(), client, ai: fakeAi(), references,
    })
    const userContent = client.messages.stream.mock.calls[0][0].messages[0].content
    expect(userContent).toContain('CUSTOM BIBLE FACTS')
  })

  it('works without bookText (older callers)', async () => {
    const emit = vi.fn()
    await reimaginePassage({
      ...base, bookText: undefined, emit, client: fakeClient(), ai: fakeAi(), references,
    })
    expect(emit.mock.calls.map((c) => c[0].type)).toContain('image')
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

  it('animates with the standard model using the motion choreography and closed-frame rules', async () => {
    const ai = fakeAi()
    await reimaginePassage({ ...base, emit: vi.fn(), client: fakeClient(), ai, references })
    const veoParams = ai.models.generateVideos.mock.calls[0][0]
    expect(veoParams.model).toBe('veo-3.1-generate-preview') // best quality, emptiest pool
    expect(veoParams.config).toMatchObject({
      durationSeconds: 4, resolution: '720p', aspectRatio: '16:9', // GIF-length loop
    })
    expect(veoParams.config.negativePrompt).toContain('structures materializing')
    expect(veoParams.prompt).toContain('lantern light flickers')
    expect(veoParams.prompt).toContain('Nothing new may enter the frame')
    // real GIF feel: the scene moves, not the camera
    expect(veoParams.prompt).toContain('KEEP THE CAMERA STILL')
    expect(veoParams.prompt).toContain('animated GIF')
    expect(veoParams.image.mimeType).toBe('image/jpeg')
  })

  it('walks the quota fallback chain: standard -> fast -> lite (no negativePrompt on lite)', async () => {
    const emit = vi.fn()
    const ai = fakeAi({
      veoQuotaModels: ['veo-3.1-generate-preview', 'veo-3.1-fast-generate-preview'],
    })
    await reimaginePassage({ ...base, emit, client: fakeClient(), ai, references })
    const models = ai.models.generateVideos.mock.calls.map((c) => c[0].model)
    expect(models).toEqual([
      'veo-3.1-generate-preview',
      'veo-3.1-fast-generate-preview',
      'veo-3.1-lite-generate-preview',
    ])
    const liteParams = ai.models.generateVideos.mock.calls[2][0]
    expect(liteParams.config.negativePrompt).toBeUndefined() // lite rejects it
    expect(emit.mock.calls.map((c) => c[0].type)).toContain('clip')
  })

  it('strips character names from the video prompt (Veo blocks person names)', async () => {
    const ai = fakeAi()
    await reimaginePassage({
      ...base,
      text: '"Hop on," Jonah Pickett said. Day Grissom hollered back.',
      bookText: 'Felicity watched as Jonah Pickett rolled to the bus.',
      emit: vi.fn(),
      client: fakeClient({ motionPrompt: 'Jonah waves while Felicity steps closer' }),
      ai, references,
    })
    const veoPrompt = ai.models.generateVideos.mock.calls[0][0].prompt
    expect(veoPrompt).not.toContain('Jonah')
    expect(veoPrompt).not.toContain('Felicity')
    expect(veoPrompt).not.toContain('Grissom')
    expect(veoPrompt).toContain('the boy in the electric wheelchair')
    expect(veoPrompt).toContain('the brown-haired girl')
    // the STILL prompt keeps names (image model doesn't block them)
    const stillPrompt = ai.interactions.create.mock.calls[0][0].input.find(
      (p) => p.type === 'text',
    ).text
    expect(stillPrompt).toContain('Jonah Pickett')
  })

  it('passes sister cards as extra style references for cut-to-cut consistency', async () => {
    const ai = fakeAi()
    await reimaginePassage({
      ...base,
      extraReferences: [{ data: 'c2lzdGVy', mimeType: 'image/png' }],
      emit: vi.fn(), client: fakeClient(), ai, references,
    })
    const params = ai.interactions.create.mock.calls[0][0]
    const imageParts = params.input.filter((p) => p.type === 'image')
    expect(imageParts.at(-1)).toEqual({ type: 'image', mime_type: 'image/png', data: 'c2lzdGVy' })
    const promptText = params.input.find((p) => p.type === 'text').text
    expect(promptText).toContain('neighbouring scenes from the same book')
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
