// server/pipeline.js
import Anthropic from '@anthropic-ai/sdk'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from './scene-schema.js'
import { loadReferenceImages, generateBeatImages } from './images.js'
import { loadVoiceConfig, generateBeatSpeech } from './speech.js'
import { GENERATED_DIR } from './paths.js'
import { defaultGenAi } from './genai.js'

export async function runExperiencePipeline({
  imageBase64,
  mediaType,
  emit,
  client = new Anthropic(),
  genAi = defaultGenAi(),
  references = loadReferenceImages(),
  voiceConfig = loadVoiceConfig(),
  saveDir = GENERATED_DIR,
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
  await Promise.all([
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

  emit({ type: 'status', stage: 'animating', label: 'Bringing the pages to life...' })

  emit({ type: 'status', stage: 'done', label: 'Experience complete!' })
}
