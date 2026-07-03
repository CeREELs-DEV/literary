// server/reimagine.js
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { defaultGenAi } from './genai.js'
import { GENERATED_DIR } from './paths.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from './images.js'
import { clampText } from './story.js'
import { BOOK_CONTEXT, stripCharacterNames } from './book.js'
import { COMMON_STYLE } from './style.js'

const MAX_REFERENCES = 3 // small budget — the style is also locked in words
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
        'lively GIF-style motion for that illustration: what the CHARACTERS visibly do (blink, breathe, turn, gesture, step) and what ambient elements move (fabric, hair, flags, dust, light, rain) — continuous and clearly visible, camera stays still; story logic must be exact; only elements already in the frame',
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
- motionPrompt: choreograph the moment like a living animated GIF, not a camera move.
  The characters must visibly move — blinking, breathing, turning, gesturing, stepping —
  and ambient elements (fabric, hair, flags, dust, lantern light, rain) keep moving
  continuously. The camera stays still. Spatial logic must match the story exactly
  (a character fleeing moves AWAY from the threat). Use only elements already visible;
  never invent new objects, structures, or characters.
- The label is a short English name of the era/setting.
- In motionPrompt, NEVER use character names — refer to characters only by their
  appearance ("the girl", "the boy in the wheelchair", "the bus driver").
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

// Quota fallback chain: quotas are per-model, so when one pool is spent the
// next may still be open. Standard first (best quality + the emptiest pool).
const VIDEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-lite-generate-preview',
]

// Run a Veo image-to-video generation (quota-chained) and save the mp4.
async function renderVeoClip({ ai, prompt, src, saveDir, sleep, durationSeconds = 4 }) {
  const request = (model) =>
    ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: src.slice(src.indexOf(',') + 1),
        mimeType: src.slice(5, src.indexOf(';')),
      },
      config: {
        durationSeconds,
        resolution: '720p',
        aspectRatio: '16:9',
        // The lite model rejects negativePrompt (400).
        ...(model !== 'veo-3.1-lite-generate-preview'
          ? { negativePrompt: NEGATIVE_PROMPT }
          : {}),
      },
    })

  let operation = null
  for (const [i, model] of VIDEO_MODELS.entries()) {
    try {
      operation = await request(model)
      break
    } catch (err) {
      const last = i === VIDEO_MODELS.length - 1
      if (!isQuotaError(err) || last) throw err
      console.warn(`${model} quota exhausted, trying ${VIDEO_MODELS[i + 1]}`)
    }
  }
  operation = await awaitOperation(ai, operation, sleep)

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    // Surface the real reason (often content filtering) instead of a shrug.
    const filtered = operation.response?.raiMediaFilteredReasons
    throw new Error(
      operation.error?.message ??
        (filtered?.length
          ? `Veo filtered the video: ${JSON.stringify(filtered)}`
          : 'Veo operation returned no video'),
    )
  }

  const filename = `remix-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })
  return `/api/media/${filename}`
}

// Animate the reimagined still into a short GIF-like loop clip.
export async function animateStill({
  ai,
  text,
  bookText,
  design,
  src,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  // Veo's filter blocks person-like proper names — every text reaching the
  // video prompt is name-stripped (visual descriptors instead).
  const safeText = stripCharacterNames(text)
  const safeMotion = stripCharacterNames(design.motionPrompt)
  const storyContext = bookText
    ? `The full story, so the motion fits its context: ` +
      `"${stripCharacterNames(clampText(bookText, 600))}". `
    : ''
  const prompt =
    `${storyContext}This is one moment from a children's story: "${safeText}". Bring this exact ` +
    `illustration alive like an animated GIF. The illustration is the first frame and ` +
    `its art style is the law: preserve the characters, linework, color palette, and ` +
    `composition; do not restyle, redraw, or add realism. KEEP THE CAMERA STILL — no ` +
    `zooming or panning; the life must come from the scene itself: the characters ` +
    `visibly move (blink, breathe, turn, gesture) and ambient elements keep moving. ` +
    `Nothing new may enter the frame: no new objects, walls, structures, or characters ` +
    `may appear, form, or morph. The motion follows the story's spatial and emotional ` +
    `logic exactly: ${safeMotion}`
  // 4s GIF-length loop — roughly halves the wait vs 8s.
  return renderVeoClip({ ai, prompt, src, saveDir, sleep, durationSeconds: 4 })
}

// Claude structures the wish into a grounded, English period + motion design.
export async function designReimagine({
  text,
  sceneTitle = '',
  wish,
  bookText = '',
  bookContext = BOOK_CONTEXT,
  client = new Anthropic(),
}) {
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
          (bookContext
            ? `Book bible (canon characters, setting, visual identity): "${clampText(bookContext)}"\n`
            : '') +
          (bookText ? `Full book text (for story context): "${clampText(bookText)}"\n` : '') +
          `The selected passage to reimagine: "${text}"\n` +
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
  return JSON.parse(textBlock.text)
}

export const RESTAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'videoPrompt'],
  properties: {
    label: {
      type: 'string',
      description: 'short English label of the era/setting, e.g. "1800s Joseon Korea"',
    },
    videoPrompt: {
      type: 'string',
      description:
        'the canonical GIF-loop prompt rewritten for the wished era/setting — same ' +
        'visual idea, same characters, same fixed camera and loop motion, but a ' +
        'period-accurate world',
    },
  },
}

export const RESTAGE_SYSTEM = `You help a child reimagine one card of an animated storybook
in a different time and place. You are given the CANONICAL STAGING — the exact short-loop
(GIF) prompt that produced the original card of this moment — plus the passage it depicts
and the child's wish (which may be written in any language).

Rewrite the staging prompt for the wished era/setting. Rules:
- Keep the staging intact: the same single visual idea, the same characters, the same
  small looping movements, the same FIXED camera, the same mood, the same
  "4-second seamless loop, 16:9" opening.
- Change ONLY the world: clothing, architecture, objects, materials, landscape —
  all period-accurate and concrete for the wished era/place (an 1800s Joseon village
  has hanok roofs, hanbok, low wooden tables — not neon signs).
- Never add floating letters, magical words, runes, readable text, heavy magic
  effects, glowing-monster eyes, or horror imagery.
- Never use character names; refer to characters by appearance only.
- ALL output must be in English, whatever language the wish is written in. The label
  is a short English name of the era/setting.`

// Rewrite the canonical staging prompt into the child's wished era.
export async function designRestaging({
  staging,
  text,
  wish,
  bookContext = BOOK_CONTEXT,
  client = new Anthropic(),
}) {
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: RESTAGE_SCHEMA } },
    system: RESTAGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          (bookContext
            ? `Book bible (canon characters, setting, visual identity): "${clampText(bookContext)}"\n`
            : '') +
          `The passage this moment depicts: "${text}"\n` +
          `CANONICAL STAGING (the original clip's prompt): "${staging}"\n` +
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
  return JSON.parse(textBlock.text)
}

// Turn a selected passage + the child's free-text wish into a period-adapted
// remix card, streamed progressively: design -> still image -> animated loop.
// The clip is an upgrade — its failure never sinks the card.
// extraReferences: recently generated sister cards, passed along so the art
// style stays consistent from cut to cut.
export async function reimaginePassage({
  text,
  sceneTitle = '',
  wish,
  bookText = '',
  bookContext = BOOK_CONTEXT,
  staging = null,
  extraReferences = [],
  emit,
  client = new Anthropic(),
  ai = defaultGenAi(),
  references = loadReferenceImages(),
  saveDir = GENERATED_DIR,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  if (!ai) throw new Error('Image generation is unavailable (GEMINI_API_KEY missing).')

  // Sample-book passages carry their canonical staging prompt — the transform
  // keeps the sample's scene composition: Claude restages the prompt for the
  // wished era, Nano Banana paints its first frame (style refs attached), and
  // Veo brings that frame to life for the full 8 seconds.
  if (staging) {
    const design = await designRestaging({ staging, text, wish, bookContext, client })
    emit({ type: 'design', label: design.label })

    const referenceParts = references.slice(0, MAX_REFERENCES).map((ref) => ({
      type: 'image',
      mime_type: ref.mimeType,
      data: ref.data,
    }))
    const stillPrompt =
      `${COMMON_STYLE}\n\nPaint the OPENING FRAME (the very first frame) of this loop: ` +
      `${design.videoPrompt}\nNo text or letters in the image.`
    const generate = async (model) => {
      const interaction = await ai.interactions.create({
        model,
        input: [{ type: 'text', text: stillPrompt }, ...referenceParts],
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

    try {
      const prompt =
        `The attached illustration is the first frame of this short seamless loop — ` +
        `its art style is the law: preserve the characters, linework, color palette, ` +
        `and composition; do not restyle, redraw, or add realism. Keep the camera ` +
        `fixed and the movements small, like an animated GIF. Play the loop exactly ` +
        `as staged: ${stripCharacterNames(design.videoPrompt)}`
      const clipUrl = await renderVeoClip({ ai, prompt, src, saveDir, sleep, durationSeconds: 4 })
      emit({ type: 'clip', url: clipUrl })
    } catch (err) {
      console.error('remix clip failed:', err?.message ?? err)
      // Non-fatal: the card stays a still.
    }
    return
  }

  // 1) Claude structures the wish into a grounded, English period + motion design.
  const design = await designReimagine({ text, sceneTitle, wish, bookText, bookContext, client })

  // 2) Nano Banana renders the still — reference art style kept, world changed.
  // Style refs first, then up to 3 sister cards for cut-to-cut consistency.
  const referenceParts = [
    ...references.slice(0, MAX_REFERENCES),
    ...extraReferences.slice(-3),
  ].map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const prompt =
    `STYLE LOCK — this is one cut of an ongoing animated series. The first attached ` +
    `reference images define the series' art style: flat cel-shaded 2D animation style, ` +
    `clean uniform line weight, simple flat color fills, soft muted palette. Every cut ` +
    `must look drawn by the same hand: same line weight, same flat shading (no painterly ` +
    `rendering, no watercolor, no 3D, no photorealism), same character proportions and ` +
    `face designs, same color palette, same level of background detail. ` +
    (extraReferences.length
      ? `The last ${Math.min(extraReferences.length, 3)} attached image(s) are the ` +
        `IMMEDIATELY PRECEDING cuts of this very scene — the same characters wearing the ` +
        `same outfits in the same location and lighting. Continue them exactly: reuse ` +
        `their character renderings, palette, and rendering technique verbatim. `
      : '') +
    (bookContext
      ? `Canon (characters and world): "${clampText(bookContext, 900)}". `
      : '') +
    (bookText
      ? `The full story, so the moment fits its context: "${clampText(bookText, 1200)}". `
      : '') +
    `Now illustrate this story moment: "${text}" — transported to ${design.label}. ` +
    `${design.illustrationPrompt} Adapt only the costumes, architecture, props, and ` +
    `landscape to the period; the art style stays locked. Wide cinematic composition. ` +
    `No text or letters in the image.`
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
    const clipUrl = await animateStill({ ai, text, bookText, design, src, saveDir, sleep })
    emit({ type: 'clip', url: clipUrl })
  } catch (err) {
    console.error('remix clip failed:', err?.message ?? err)
    // Non-fatal: the card stays a Ken Burns still.
  }
}
