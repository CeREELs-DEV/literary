// tests/server/illustrate.test.js
import { describe, it, expect, vi } from 'vitest'
import { illustratePrompt } from '../../server/illustrate.js'

const references = [
  { data: 'cmVmMQ==', mimeType: 'image/png' },
  { data: 'cmVmMg==', mimeType: 'image/png' },
  { data: 'cmVmMw==', mimeType: 'image/png' },
  { data: 'cmVmNA==', mimeType: 'image/png' },
]

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

const prompt =
  'Create an illustration of a quiet school courtyard where every table is messy ' +
  'except one perfectly clean table.'

describe('illustratePrompt', () => {
  it('renders the student prompt with at most 3 style references', async () => {
    const ai = fakeAi()
    const src = await illustratePrompt({ prompt, ai, references })
    const params = ai.interactions.create.mock.calls[0][0]
    expect(params.model).toBe('gemini-3-pro-image')
    expect(params.input[0].text).toContain(prompt)
    expect(params.input[0].text).toContain('art style of the attached reference images')
    expect(params.input.filter((p) => p.type === 'image')).toHaveLength(3)
    expect(params.response_format).toMatchObject({ type: 'image', aspect_ratio: '16:9' })
    expect(src.startsWith('data:image/jpeg;base64,')).toBe(true)
  })

  it('falls back to the Lite model when Pro fails', async () => {
    const ai = fakeAi({ failOn: 'gemini-3-pro-image' })
    await illustratePrompt({ prompt, ai, references })
    const models = ai.interactions.create.mock.calls.map((c) => c[0].model)
    expect(models).toEqual(['gemini-3-pro-image', 'gemini-3.1-flash-lite-image'])
  })

  it('throws when image generation is unavailable (ai is null)', async () => {
    await expect(illustratePrompt({ prompt, ai: null, references })).rejects.toThrow(
      /unavailable/i,
    )
  })
})
