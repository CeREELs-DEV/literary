// scripts/make-samples.mjs
//
// Pre-generate the demo's "original" sample cards from book-page photos.
// For every page photo in scripts/sample-pages/:
//   1. Claude reads the page -> verbatim beats + dialogue speech segments
//   2. Each beat becomes a canonical remix card (faithful to the book):
//      still illustration + moving loop, saved under public/samples/
//   3. Beats with dialogue also get ElevenLabs TTS audio
// Results are written to public/samples/manifest.json (resumable: pages
// already in the manifest are skipped).
//
// Usage: npm run make-samples   (requires ANTHROPIC/GEMINI[/ELEVENLABS] keys in .env)

import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { reimaginePassage } from '../server/reimagine.js'
import { loadVoiceConfig, generateBeatSpeech } from '../server/speech.js'
import { BOOK_TITLE } from '../server/book.js'

const PAGES_DIR = 'scripts/sample-pages'
const OUT_DIR = 'public/samples'
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

const CANON_WISH =
  'Exactly as in the original book — keep Midnight Gulch, its era, place, and mood ' +
  'unchanged. A faithful depiction of this very moment.'

// Script-local schema: verbatim beats plus dialogue-aware speech segments.
const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'beats'],
  properties: {
    title: { type: 'string', description: 'short title for this page/scene' },
    beats: {
      type: 'array',
      description: '3-6 sequential passages covering the printed text in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'speech'],
        properties: {
          text: { type: 'string', description: 'verbatim sentence(s) from the page' },
          speech: {
            type: 'array',
            description: 'the passage split into voice segments, in reading order',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'text', 'delivery'],
              properties: {
                speaker: { enum: ['narrator', 'character-1', 'character-2'] },
                text: { type: 'string' },
                delivery: { enum: ['normal', 'whisper', 'excited', 'shout', 'sad'] },
              },
            },
          },
        },
      },
    },
  },
}

const PAGE_SYSTEM = `You extract the printed text of a children's book page photo.
Split it into 3-6 sequential passages (verbatim, fixing only OCR-style artifacts).
For each passage, split the text into voice segments: prose and attribution go to
"narrator"; quoted dialogue goes to "character-1" or "character-2" (assign each story
character one id, consistently; strip surrounding quotes). Infer delivery from the text
("...she whispered" -> whisper). ALL output in English.`

async function readPage(client, filePath, mediaType) {
  const imageBase64 = fs.readFileSync(filePath).toString('base64')
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: PAGE_SCHEMA } },
    system: PAGE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: 'Extract this page into passages with voice segments.' },
        ],
      },
    ],
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') throw new Error('page read refused')
  const block = message.content.find((b) => b.type === 'text')
  return JSON.parse(block.text)
}

function saveDataUrl(src, basename) {
  const mime = src.slice(5, src.indexOf(';'))
  const ext = mime === 'image/png' ? 'png' : 'jpg'
  const file = `${basename}.${ext}`
  fs.writeFileSync(path.join(OUT_DIR, file), Buffer.from(src.slice(src.indexOf(',') + 1), 'base64'))
  return `/samples/${file}`
}

const toSamplesUrl = (mediaUrl) => `/samples/${path.basename(mediaUrl)}`

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const photos = fs.existsSync(PAGES_DIR)
    ? fs.readdirSync(PAGES_DIR).filter((n) => MIME_BY_EXT[path.extname(n).toLowerCase()]).sort()
    : []
  if (photos.length === 0) {
    console.log(`No page photos found — put book page photos into ${PAGES_DIR}/ first.`)
    return
  }

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : { title: BOOK_TITLE, pages: [] }

  const client = new Anthropic()
  const voiceConfig = loadVoiceConfig()
  if (!voiceConfig) console.warn('ELEVENLABS keys missing — dialogue audio will be skipped.')

  for (const photo of photos) {
    if (manifest.pages.some((p) => p.photo === photo)) {
      console.log(`skip ${photo} (already in manifest)`)
      continue
    }
    console.log(`reading ${photo}...`)
    const scene = await readPage(
      client,
      path.join(PAGES_DIR, photo),
      MIME_BY_EXT[path.extname(photo).toLowerCase()],
    )
    const bookText = scene.beats.map((b) => b.text).join(' ')
    const page = { photo, sceneTitle: scene.title, beats: [] }

    for (const [i, beat] of scene.beats.entries()) {
      console.log(`  [${i + 1}/${scene.beats.length}] "${beat.text.slice(0, 50)}..."`)
      const card = { text: beat.text, still: null, clip: null, audio: [] }
      try {
        await reimaginePassage({
          text: beat.text,
          sceneTitle: scene.title,
          wish: CANON_WISH,
          bookText,
          saveDir: OUT_DIR, // clips download straight into public/samples/
          emit: (event) => {
            if (event.type === 'image') {
              card.still = saveDataUrl(event.src, `still-${path.parse(photo).name}-${i}`)
            } else if (event.type === 'clip') {
              card.clip = toSamplesUrl(event.url)
            }
          },
        })
      } catch (err) {
        console.error(`  beat ${i} failed:`, err?.message ?? err)
      }
      const hasDialogue = (beat.speech ?? []).some((s) => s.speaker !== 'narrator')
      if (hasDialogue && voiceConfig) {
        try {
          await generateBeatSpeech({
            scene: { beats: [beat] },
            config: voiceConfig,
            saveDir: OUT_DIR,
            emit: (event) => {
              if (event.type === 'speech') card.audio = event.urls.map(toSamplesUrl)
            },
          })
        } catch (err) {
          console.error(`  beat ${i} audio failed:`, err?.message ?? err)
        }
      }
      if (card.still) page.beats.push(card)
    }

    manifest.pages.push(page)
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
    console.log(`saved ${page.beats.length} cards for ${photo}`)
  }
  console.log(`done — manifest at ${MANIFEST_PATH}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
