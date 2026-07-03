// server/illustrate.js
import { defaultGenAi } from './genai.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from './images.js'

const MAX_REFERENCES = 3

// Render a student's interpretation prompt as one possible illustration.
// The result is a hypothesis to discuss, not an answer key.
export async function illustratePrompt({
  prompt,
  ai = defaultGenAi(),
  references = loadReferenceImages(),
}) {
  if (!ai) throw new Error('Image generation is unavailable (GEMINI_API_KEY missing).')
  const referenceParts = references.slice(0, MAX_REFERENCES).map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const fullPrompt =
    `Match the art style of the attached reference images: flat hand-drawn 2D ` +
    `storybook illustration, clean linework, soft warm muted palette. ${prompt}`
  const generate = async (model) => {
    const interaction = await ai.interactions.create({
      model,
      input: [{ type: 'text', text: fullPrompt }, ...referenceParts],
      response_format: { type: 'image', aspect_ratio: '16:9' },
    })
    const data = interaction?.output_image?.data
    if (!data) throw new Error('no image data in response')
    return data
  }
  let data
  try {
    data = await generate(PRO_MODEL)
  } catch {
    data = await generate(LITE_MODEL)
  }
  return `data:${sniffImageMime(data)};base64,${data}`
}
