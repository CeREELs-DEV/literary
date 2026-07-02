// server/reimagine.js
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { defaultGenAi } from './genai.js'
import { GENERATED_DIR } from './paths.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from './images.js'

const MAX_REFERENCES = 8
const POLL_INTERVAL_MS = 10_000

export const REIMAGINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'illustrationPrompt', 'motionPrompt'],
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
    motionPrompt: {
      type: 'string',
      description:
        'choreography for animating that illustration as a short loop: who/what moves, in which direction, with what emotion — story logic must be exact (fleeing means moving AWAY from the threat); only elements already in the frame, subtle and loop-friendly',
    },
  },
}

export const REIMAGINE_SYSTEM = `You help a child reimagine a story moment in a different
time and place. Given a passage from a children's story and the child's wish (which may be
written in any language), design how that exact moment would look transported to the wished
era and setting — and how it would gently move as a short animated loop.

Rules:
- Keep the story moment and its characters exactly the same — only the world changes:
  clothing, architecture, objects, landscape, atmosphere of the wished period and place.
- Be concrete and period-accurate (an 1800s Joseon village has hanok roofs, hanbok,
  paper lanterns — not neon signs).
- motionPrompt: choreograph the moment's action for an animator. State who moves, in
  which direction, with what emotion — the spatial logic must match the story exactly
  (a character fleeing moves AWAY from the threat). Use only elements already visible;
  never invent new objects, structures, or characters. Subtle, physically plausible,
  loop-friendly motion.
- The label is a short English name of the era/setting.
- ALL output must be in English, whatever language the wish is written in.`

const NEGATIVE_PROMPT =
  'new objects appearing, structures materializing, walls forming, morphing, ' +
  'warping, extra characters, scene change, style change, photorealism, ' +
  'distortion, glitches, text'

function isQuotaError(err) {
  const msg = String(err?.message ?? err)
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')
}

async function awaitOperation(ai, operation, sleep) {
  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }
  return operation
}

// Animate the reimagined still into a short GIF-like loop clip.
// Lite is the primary model (its quota pool is the one we actually have).
async function animateStill({ ai, text, design, src, saveDir, sleep }) {
  const prompt =
    `This is one moment from a children's story: "${text}". Animate this exact ` +
    `illustration as that moment unfolds. The illustration is the first frame and its ` +
    `art style is the law: preserve the characters, linework, color palette, and ` +
    `composition; do not restyle, redraw, or add realism. Nothing new may enter the ` +
    `frame: no new objects, walls, structures, or characters may appear, form, or ` +
    `morph. The motion must follow the story's spatial and emotional logic exactly: ` +
    `${design.motionPrompt}`
  const request = (model) =>
    ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: src.slice(src.indexOf(',') + 1),
        mimeType: src.slice(5, src.indexOf(';')),
      },
      config: {
        durationSeconds: 8,
        resolution: '720p',
        aspectRatio: '16:9',
        // The lite model rejects negativePrompt (400) — fast only.
        ...(model === 'veo-3.1-fast-generate-preview'
          ? { negativePrompt: NEGATIVE_PROMPT }
          : {}),
      },
    })

  let operation
  try {
    operation = await request('veo-3.1-lite-generate-preview')
  } catch (err) {
    if (!isQuotaError(err)) throw err
    console.warn('lite model quota exhausted, retrying with fast:', err?.message ?? err)
    operation = await request('veo-3.1-fast-generate-preview')
  }
  operation = await awaitOperation(ai, operation, sleep)

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    throw new Error(operation.error?.message ?? 'Veo operation returned no video')
  }

  const filename = `remix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })
  return `/api/media/${filename}`
}

// Turn a selected passage + the child's free-text wish into a period-adapted
// remix card, streamed progressively: design -> still image -> animated loop.
// The clip is an upgrade — its failure never sinks the card.
export async function reimaginePassage({
  text,
  sceneTitle = '',
  wish,
  emit,
  client = new Anthropic(),
  ai = defaultGenAi(),
  references = loadReferenceImages(),
  saveDir = GENERATED_DIR,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  if (!ai) throw new Error('Image generation is unavailable (GEMINI_API_KEY missing).')

  // 1) Claude structures the wish into a grounded, English period + motion design.
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

  // 2) Nano Banana renders the still — reference art style kept, world changed.
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
  const src = `data:${sniffImageMime(data)};base64,${data}`
  emit({ type: 'image', label: design.label, src })

  // 3) Veo brings the still to life — a true moving loop.
  try {
    const clipUrl = await animateStill({ ai, text, design, src, saveDir, sleep })
    emit({ type: 'clip', url: clipUrl })
  } catch (err) {
    console.error('remix clip failed:', err?.message ?? err)
    // Non-fatal: the card stays a Ken Burns still.
  }
}
