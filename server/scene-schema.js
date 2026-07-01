// server/scene-schema.js

const shakeEffect = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'intensity', 'duration'],
  properties: {
    type: { const: 'shake' },
    intensity: { enum: ['low', 'high'] },
    duration: { type: 'integer', description: 'milliseconds, 300-900' },
  },
}

const flashEffect = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'color', 'strength', 'duration'],
  properties: {
    type: { const: 'flash' },
    color: { type: 'string', description: 'CSS color, e.g. #ffffff or #000000' },
    strength: { type: 'number', description: 'opacity 0.1-0.8' },
    duration: { type: 'integer', description: 'milliseconds, 150-500' },
  },
}

export const SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'beats'],
  properties: {
    id: { type: 'string', description: 'kebab-case scene id' },
    title: { type: 'string', description: 'short scene title' },
    beats: {
      type: 'array',
      description: '3 to 6 beats covering the page text in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'amplifiedCaption', 'duration', 'narration', 'effects'],
        properties: {
          text: { type: 'string', description: 'verbatim sentence(s) from the page' },
          amplifiedCaption: {
            type: 'string',
            description: 'imaginative sensory amplification of the text',
          },
          duration: { type: 'integer', description: 'milliseconds, 2500-4500' },
          narration: { type: 'string', description: 'same as text, for read-aloud' },
          effects: {
            type: 'array',
            items: { anyOf: [shakeEffect, flashEffect] },
          },
        },
      },
    },
  },
}

export const SYSTEM_PROMPT = `You are a sensory experience designer for a children's literary imagination app.
Given a photo of a book page, you extract the printed text and turn it into a "beat timeline"
that amplifies the literary imagery into sensory experience.

Rules:
- Extract the actual printed text from the photo. Split it into 3-6 sequential beats.
- beat.text: the verbatim text for that beat (fix obvious OCR-style artifacts only).
- beat.amplifiedCaption: fill the imaginative gap. If the text says "The door closed.",
  the caption might be "The whole house shuddered with a thud". Evocative, concrete, sensory.
- beat.narration: copy of beat.text (used for read-aloud).
- beat.duration: 2500-4500 ms depending on text length.
- effects: use shake for physical impact/movement (high for slams, crashes, thunder;
  low for wind, trembling, footsteps). Use flash for light/impact moments
  (white flash for lightning/brightness, dark flash color #000000 for dread/impact).
  Quiet beats may have an empty effects array - silence is also a sensory choice.
- ALL output text must be in English. If the page is in another language, translate it.
- The scene id must be kebab-case; the title short and evocative.`

export const USER_INSTRUCTION =
  'Read this book page photo and produce the sensory beat timeline JSON.'
