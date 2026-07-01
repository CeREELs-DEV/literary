// server/pipeline.js
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from './scene-schema.js'
import { loadReferenceImages, generateBeatImages } from './images.js'
import { generateSceneClip } from './video.js'
import { GENERATED_DIR } from './paths.js'

function defaultGenAi() {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

// Pick the most dramatic beat to animate: first high-intensity shake, else beat 0.
function heroBeatIndex(scene) {
  const i = scene.beats.findIndex((b) =>
    (b.effects ?? []).some((e) => e.type === 'shake' && e.intensity === 'high'),
  )
  return i >= 0 ? i : 0
}

export async function runExperiencePipeline({
  imageBase64,
  mediaType,
  emit,
  client = new Anthropic(),
  genAi = defaultGenAi(),
  references = loadReferenceImages(),
  saveDir = GENERATED_DIR,
  sleep,
}) {
  emit({ type: 'status', stage: 'reading', label: 'Reading the page...' })

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: SCENE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error('The model refused to process this image.')
  }

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock) {
    throw new Error('No text content in model response.')
  }

  emit({ type: 'status', stage: 'designing', label: 'Designing the sensory experience...' })

  const scene = JSON.parse(textBlock.text)
  emit({ type: 'scene', scene })

  // Phase B visuals — skip gracefully when unavailable (Phase A behavior preserved).
  if (!genAi || references.length === 0) {
    emit({ type: 'status', stage: 'done', label: 'Experience ready!' })
    return
  }

  emit({ type: 'status', stage: 'drawing', label: 'Drawing the scenes...' })
  const images = await generateBeatImages({ scene, references, emit, ai: genAi })

  // Frontend starts the image-backed experience on this signal;
  // the clip keeps generating in the background.
  emit({ type: 'status', stage: 'animating', label: 'Breathing motion into the scene...' })

  const heroIdx = heroBeatIndex(scene)
  const hero = images.find((img) => img.index === heroIdx) ?? images[0]
  if (hero) {
    try {
      await generateSceneClip({
        imageBase64: hero.src.slice(hero.src.indexOf(',') + 1),
        prompt:
          `${scene.beats[hero.index].amplifiedCaption}. ` +
          `Cinematic children's storybook animation, gentle camera movement, matching the illustration's art style.`,
        emit,
        ai: genAi,
        saveDir,
        ...(sleep ? { sleep } : {}),
      })
    } catch {
      // Clip is an upgrade, not a requirement — the image experience already played.
      emit({ type: 'status', stage: 'animating', label: 'Animation unavailable this time.' })
    }
  }

  emit({ type: 'status', stage: 'done', label: 'Experience complete!' })
}
