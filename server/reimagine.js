// server/reimagine.js
import Anthropic from '@anthropic-ai/sdk'
import { defaultGenAi } from './genai.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from './images.js'

const MAX_REFERENCES = 8

export const REIMAGINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'illustrationPrompt'],
  properties: {
    label: {
      type: 'string',
      description: 'short English label of the era/setting, e.g. "1800s Joseon Korea"',
    },
    illustrationPrompt: {
      type: 'string',
      description:
        'how to draw the story moment transported to that era/setting: period-accurate costumes, architecture, props, atmosphere — concrete and visual',
    },
  },
}

export const REIMAGINE_SYSTEM = `You help a child reimagine a story moment in a different
time and place. Given a passage from a children's story and the child's wish (which may be
written in any language), design how that exact moment would look transported to the wished
era and setting.

Rules:
- Keep the story moment and its characters exactly the same — only the world changes:
  clothing, architecture, objects, landscape, atmosphere of the wished period and place.
- Be concrete and period-accurate (an 1800s Joseon village has hanok roofs, hanbok,
  paper lanterns — not neon signs).
- The label is a short English name of the era/setting.
- ALL output must be in English, whatever language the wish is written in.`

// Turn a selected passage + the child's free-text wish into a period-adapted
// illustration that keeps the reference art style.
export async function reimaginePassage({
  text,
  sceneTitle = '',
  wish,
  client = new Anthropic(),
  ai = defaultGenAi(),
  references = loadReferenceImages(),
}) {
  if (!ai) throw new Error('Image generation is unavailable (GEMINI_API_KEY missing).')

  // 1) Claude structures the wish into a grounded, English period design.
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: REIMAGINE_SCHEMA } },
    system: REIMAGINE_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Story title: "${sceneTitle}"\n` +
          `Passage: "${text}"\n` +
          `The child's wish: "${wish}"`,
      },
    ],
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') {
    throw new Error('Could not reimagine this passage.')
  }
  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No design in model response.')
  const design = JSON.parse(textBlock.text)

  // 2) Nano Banana renders it — reference art style is kept, only the world changes.
  const referenceParts = references.slice(0, MAX_REFERENCES).map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const prompt =
    `The attached reference images show the characters and art style of a children's ` +
    `story. Reimagine this story moment: "${text}" — transported to ${design.label}. ` +
    `${design.illustrationPrompt} Keep EXACTLY the reference art style, palette, and ` +
    `linework; adapt only the costumes, architecture, props, and landscape to the ` +
    `period. Wide cinematic composition. No text or letters in the image.`
  const generate = async (model) => {
    const interaction = await ai.interactions.create({
      model,
      input: [{ type: 'text', text: prompt }, ...referenceParts],
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

  return { label: design.label, src: `data:${sniffImageMime(data)};base64,${data}` }
}
