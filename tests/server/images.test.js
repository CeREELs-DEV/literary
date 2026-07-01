// tests/server/images.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateBeatImages, sniffImageMime } from '../../server/images.js'

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

function fakeAi({ failIndex = -1 } = {}) {
  let call = 0
  return {
    interactions: {
      create: vi.fn(async () => {
        const i = call++
        if (i === failIndex) throw new Error('gen failed')
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

  it('tolerates a single failure and still returns the others', async () => {
    const emit = vi.fn()
    const images = await generateBeatImages({ scene, references, emit, ai: fakeAi({ failIndex: 0 }) })
    expect(images).toHaveLength(1)
    expect(emit.mock.calls.filter((c) => c[0].type === 'image')).toHaveLength(1)
  })
})
