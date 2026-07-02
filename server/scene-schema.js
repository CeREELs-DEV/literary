// server/scene-schema.js

export const SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'beats'],
  properties: {
    id: { type: 'string', description: 'kebab-case scene id' },
    title: { type: 'string', description: 'short scene title' },
    beats: {
      type: 'array',
      description: '3 to 8 short passages covering the page text in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text'],
        properties: {
          text: {
            type: 'string',
            description: 'verbatim sentence(s) from the page — one selectable passage',
          },
        },
      },
    },
  },
}

export const SYSTEM_PROMPT = `You prepare a book page for a children's imagination app.
Given a photo of a book page, extract the printed text so a child can read it and pick
passages to reimagine.

Rules:
- Extract the actual printed text from the photo (fix obvious OCR-style artifacts only).
- Split it into 3-8 sequential passages of one or two sentences each — natural
  tap-to-select units, in reading order.
- ALL output text must be in English. If the page is in another language, translate it.
- The scene id must be kebab-case; the title short and evocative.`

export const USER_INSTRUCTION =
  'Read this book page photo and produce the passage JSON.'
