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
import { reimaginePassage, designReimagine, animateStill } from '../server/reimagine.js'
import { defaultGenAi } from '../server/genai.js'
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
    // Rolling window of freshly generated cards — passed as extra references
    // so the art style stays consistent from cut to cut.
    const sisterCards = []

    for (const [i, beat] of scene.beats.entries()) {
      console.log(`  [${i + 1}/${scene.beats.length}] "${beat.text.slice(0, 50)}..."`)
      const card = { text: beat.text, still: null, clip: null, audio: [] }
      try {
        await reimaginePassage({
          text: beat.text,
          sceneTitle: scene.title,
          wish: CANON_WISH,
          bookText,
          extraReferences: sisterCards.slice(-3),
          saveDir: OUT_DIR, // clips download straight into public/samples/
          emit: (event) => {
            if (event.type === 'image') {
              card.still = saveDataUrl(event.src, `still-${path.parse(photo).name}-${i}`)
              sisterCards.push({
                data: event.src.slice(event.src.indexOf(',') + 1),
                mimeType: event.src.slice(5, event.src.indexOf(';')),
              })
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

// --retry-clips: regenerate ONLY the missing loops, keeping the existing
// stills untouched (Claude redesigns the motion; Veo animates the saved still).
async function retryClips() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  const client = new Anthropic()
  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')

  for (const page of manifest.pages) {
    const bookText = page.beats.map((b) => b.text).join(' ')
    for (const beat of page.beats) {
      if (beat.clip || !beat.still) continue
      console.log(`retrying loop: "${beat.text.slice(0, 55)}..."`)
      try {
        const design = await designReimagine({
          text: beat.text,
          sceneTitle: page.sceneTitle,
          wish: CANON_WISH,
          bookText,
          client,
        })
        const stillPath = path.join('public', beat.still.replace(/^\//, ''))
        const mime = beat.still.endsWith('.png') ? 'image/png' : 'image/jpeg'
        const src = `data:${mime};base64,${fs.readFileSync(stillPath).toString('base64')}`
        const url = await animateStill({
          ai, text: beat.text, bookText, design, src, saveDir: OUT_DIR,
        })
        beat.clip = toSamplesUrl(url)
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
        console.log(`  ✓ ${beat.clip}`)
      } catch (err) {
        console.error('  still failed:', err?.message ?? err)
      }
    }
  }
  console.log('retry pass done')
}

const run = process.argv.includes('--retry-clips') ? retryClips : main
run().catch((err) => {
  console.error(err)
  process.exit(1)
})
