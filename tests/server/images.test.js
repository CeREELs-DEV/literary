// tests/server/images.test.js
import { describe, it, expect, vi } from 'vitest'
import {
  generateBeatImages,
  generateImaginingImages,
  sniffImageMime,
} from '../../server/images.js'

describe('sniffImageMime', () => {
  it('detects JPEG bytes by base64 magic prefix', () => {
    expect(sniffImageMime('/9j/4AAQSkZJRg')).toBe('image/jpeg')
  })
  it('defaults to PNG otherwise', () => {
    expect(sniffImageMime('iVBORw0KGgo')).toBe('image/png')
  })
})

const scene = {
  id: 's', title: 't',
  beats: [
    { text: 'A', amplifiedCaption: 'wind howled', duration: 3000, effects: [] },
    { text: 'B', amplifiedCaption: 'door slammed', duration: 3000, effects: [] },
  ],
}
const references = [
  { data: 'cmVmMQ==', mimeType: 'image/png' },
  { data: 'cmVmMg==', mimeType: 'image/png' },
]

function fakeAi({ failIndex = -1, failCaption = null } = {}) {
  let call = 0
  return {
    interactions: {
      create: vi.fn(async (params) => {
        const i = call++
        if (i === failIndex) throw new Error('gen failed')
        if (failCaption) {
          const text = params.input.find((p) => p.type === 'text')?.text ?? ''
          if (text.includes(failCaption)) throw new Error('gen failed')
        }
        return { output_image: { data: `aW1nJHtpfQ==` } }
      }),
    },
  }
}

describe('generateBeatImages', () => {
  it('emits one image event per beat with data URLs and returns them', async () => {
    const emit = vi.fn()
    const ai = fakeAi()
    const images = await generateBeatImages({ scene, references, emit, ai })
    expect(images).toHaveLength(2)
    const events = emit.mock.calls.map((c) => c[0])
    expect(events.every((e) => e.type === 'image')).toBe(true)
    expect(events.map((e) => e.index).sort()).toEqual([0, 1])
    expect(events[0].src).toMatch(/^data:image\/png;base64,/)
  })

  it('sends ALL reference images and the lite model to the API', async () => {
    const ai = fakeAi()
    await generateBeatImages({ scene, references, emit: vi.fn(), ai })
    const params = ai.interactions.create.mock.calls[0][0]
    expect(params.model).toBe('gemini-3.1-flash-lite-image')
    const imageParts = params.input.filter((p) => p.type === 'image')
    expect(imageParts).toEqual([
      { type: 'image', mime_type: 'image/png', data: 'cmVmMQ==' },
      { type: 'image', mime_type: 'image/png', data: 'cmVmMg==' },
    ])
    expect(params.response_format).toEqual({ type: 'image', aspect_ratio: '16:9' })
  })

  it('retries a failed call once and recovers', async () => {
    const emit = vi.fn()
    const images = await generateBeatImages({ scene, references, emit, ai: fakeAi({ failIndex: 0 }) })
    expect(images).toHaveLength(2)
    expect(emit.mock.calls.filter((c) => c[0].type === 'image')).toHaveLength(2)
  })

  it('skips a beat that fails twice', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const emit = vi.fn()
      const images = await generateBeatImages({
        scene, references, emit, ai: fakeAi({ failCaption: 'wind howled' }),
      })
      expect(images).toHaveLength(1)
      expect(emit.mock.calls.filter((c) => c[0].type === 'image')).toHaveLength(1)
      expect(errorSpy).toHaveBeenCalled()
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe('reference cap', () => {
  it('caps references sent to the API at MAX_REFERENCES', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      data: `cmVm${i}`, mimeType: 'image/png',
    }))
    const ai = fakeAi()
    await generateBeatImages({ scene, references: many, emit: vi.fn(), ai })
    const parts = ai.interactions.create.mock.calls[0][0].input.filter((p) => p.type === 'image')
    expect(parts.length).toBeLessThanOrEqual(8)
  })
})

describe('key beat model selection', () => {
  const keyScene = { ...scene, keyBeatIndex: 1 }

  it('uses Nano Banana Pro for the key beat and Lite for the rest', async () => {
    const ai = fakeAi()
    await generateBeatImages({ scene: keyScene, references, emit: vi.fn(), ai })
    const models = ai.interactions.create.mock.calls.map((c) => c[0].model).sort()
    expect(models).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-lite-image'])
  })

  it('falls back to Lite when the Pro call fails, keeping the key beat illustrated', async () => {
    const ai = {
      interactions: {
        create: vi.fn(async (params) => {
          if (params.model === 'gemini-3-pro-image') throw new Error('pro down')
          return { output_image: { data: 'aW1n' } }
        }),
      },
    }
    const emit = vi.fn()
    const images = await generateBeatImages({ scene: keyScene, references, emit, ai })
    expect(images).toHaveLength(2)
    expect(emit.mock.calls.filter((c) => c[0].type === 'image')).toHaveLength(2)
    // the key beat's retry went to Lite
    const keyCalls = ai.interactions.create.mock.calls
      .map((c) => c[0])
      .filter((p) => p.input.some((part) => part.text?.includes('door slammed')))
    expect(keyCalls.map((p) => p.model)).toEqual([
      'gemini-3-pro-image',
      'gemini-3.1-flash-lite-image',
    ])
  })
})

describe('generateImaginingImages', () => {
  const rashomonScene = {
    ...scene,
    keyBeatIndex: 1,
    imaginings: [
      { title: 'Through her eyes', perspective: 'from the fleeing girl',
        illustrationPrompt: 'close-up, dim light', motionPrompt: 'she runs' },
      { title: 'From the rafters', perspective: 'from a mouse above',
        illustrationPrompt: 'tiny figures below', motionPrompt: 'door swings' },
    ],
  }

  it('generates one Pro illustration per imagining with story and perspective context', async () => {
    const ai = fakeAi()
    const emit = vi.fn()
    const images = await generateImaginingImages({ scene: rashomonScene, references, emit, ai })
    expect(images).toHaveLength(2)
    const calls = ai.interactions.create.mock.calls.map((c) => c[0])
    for (const params of calls) expect(params.model).toBe('gemini-3-pro-image')
    expect(calls[0].input[0].text).toContain('B') // key beat text
    expect(calls[0].input[0].text).toContain('from the fleeing girl')
    expect(calls[0].input[0].text).toContain('close-up, dim light')
    const events = emit.mock.calls.map((c) => c[0])
    expect(events.every((e) => e.type === 'imagining-image')).toBe(true)
    expect(events.map((e) => e.index).sort()).toEqual([0, 1])
  })

  it('retries on Lite when Pro fails and returns [] without imaginings', async () => {
    const ai = {
      interactions: {
        create: vi.fn(async (params) => {
          if (params.model === 'gemini-3-pro-image') throw new Error('pro down')
          return { output_image: { data: 'aW1n' } }
        }),
      },
    }
    const images = await generateImaginingImages({
      scene: rashomonScene, references, emit: vi.fn(), ai,
    })
    expect(images).toHaveLength(2)
    expect(await generateImaginingImages({ scene, references, emit: vi.fn(), ai: fakeAi() }))
      .toEqual([])
  })
})
