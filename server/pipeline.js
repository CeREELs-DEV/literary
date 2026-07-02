// server/pipeline.js
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from './scene-schema.js'
import { loadReferenceImages, generateBeatImages } from './images.js'
import { generateFilm } from './film.js'
import { loadVoiceConfig, generateBeatSpeech } from './speech.js'
import { GENERATED_DIR } from './paths.js'

function defaultGenAi() {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

export async function runExperiencePipeline({
  imageBase64,
  mediaType,
  emit,
  client = new Anthropic(),
  genAi = defaultGenAi(),
  references = loadReferenceImages(),
  voiceConfig = loadVoiceConfig(),
  saveDir = GENERATED_DIR,
  sleep,
  fetchImpl,
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

  // Visuals and speech — skip gracefully when unavailable (Phase A behavior preserved).
  const canDraw = Boolean(genAi) && references.length > 0
  const canSpeak = Boolean(voiceConfig)

  if (!canDraw && !canSpeak) {
    emit({ type: 'status', stage: 'done', label: 'Experience ready!' })
    return
  }

  emit({ type: 'status', stage: 'drawing', label: 'Illustrating and voicing the scenes...' })
  const [images] = await Promise.all([
    canDraw
      ? generateBeatImages({ scene, references, emit, ai: genAi })
      : Promise.resolve([]),
    canSpeak
      ? generateBeatSpeech({
          scene, config: voiceConfig, emit, saveDir,
          ...(fetchImpl ? { fetchImpl } : {}),
        })
      : Promise.resolve([]),
  ])

  // The frontend starts the image+voice experience on the first 'animating'
  // status; the continuous film keeps generating in the background.
  if (images.length > 0) {
    try {
      await generateFilm({
        scene, images, emit, ai: genAi, saveDir,
        ...(sleep ? { sleep } : {}),
      })
    } catch (err) {
      console.error('film generation failed:', err?.message ?? err)
      emit({ type: 'status', stage: 'animating', label: 'Film unavailable this time.' })
    }
  } else {
    emit({ type: 'status', stage: 'animating', label: 'Breathing motion into the scenes...' })
  }

  emit({ type: 'status', stage: 'done', label: 'Experience complete!' })
}
