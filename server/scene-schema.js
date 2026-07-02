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
  required: ['id', 'title', 'keyBeatIndex', 'beats'],
  properties: {
    id: { type: 'string', description: 'kebab-case scene id' },
    title: { type: 'string', description: 'short scene title' },
    keyBeatIndex: {
      type: 'integer',
      description:
        '0-based index of the single beat whose imagery most rewards visualization — the key scene',
    },
    beats: {
      type: 'array',
      description: '3 to 6 beats covering the page text in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'amplifiedCaption', 'duration', 'narration', 'effects', 'speech'],
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
          speech: {
            type: 'array',
            description:
              'the beat text split into voice segments, in reading order (1-4 segments)',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'text', 'delivery'],
              properties: {
                speaker: {
                  enum: ['narrator', 'character-1', 'character-2'],
                  description:
                    'narrator for prose; character-1/2 for quoted dialogue, assigned consistently',
                },
                text: { type: 'string', description: 'the exact words to speak' },
                delivery: {
                  enum: ['normal', 'whisper', 'excited', 'shout', 'sad'],
                  description: 'vocal delivery implied by the text',
                },
              },
            },
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
- beat.speech: split the beat's text into voice segments in reading order.
  Prose and attribution ("she said") go to speaker "narrator". Quoted dialogue goes to
  "character-1" or "character-2" — assign each story character one id and keep it
  consistent across all beats. Strip the surrounding quotes from dialogue text.
- delivery: infer from the text. "...he whispered" -> the dialogue segment gets
  delivery "whisper". Shouting/exclamations -> "shout". Excitement -> "excited".
  Sorrow -> "sad". Otherwise "normal". The narrator is usually "normal" but may
  whisper for tense, quiet moments.
- effects: use shake for physical impact/movement (high for slams, crashes, thunder;
  low for wind, trembling, footsteps). Use flash for light/impact moments
  (white flash for lightning/brightness, dark flash color #000000 for dread/impact).
  Quiet beats may have an empty effects array - silence is also a sensory choice.
- keyBeatIndex: choose the ONE beat where seeing the moment would most expand a child's
  imagination — the most vivid, transformative, or emotionally charged image in the passage.
  Not necessarily the loudest beat: pick the moment a child would most want to picture.
- ALL output text must be in English. If the page is in another language, translate it.
- The scene id must be kebab-case; the title short and evocative.`

export const USER_INSTRUCTION =
  'Read this book page photo and produce the sensory beat timeline JSON.'
