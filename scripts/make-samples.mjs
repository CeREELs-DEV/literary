// scripts/make-samples.mjs
//
// Pre-generate the demo's sample set from the book excerpt at
// scripts/sample-pages/excerpt.txt:
//   1. Claude splits the excerpt -> exactly 3 verbatim beats + speech segments
//   2. Every beat x version (Original + 4 eras, prompts in sample-prompts.mjs)
//      becomes an 8s Omni Flash clip with the public/images style references
//   3. Each beat/version gets ElevenLabs TTS (narration + dialogue) to overlay
// Results are written to public/samples/manifest.json (resumable: versions
// that already have a clip are skipped).
//
// Usage: npm run make-samples   (requires ANTHROPIC/GEMINI[/ELEVENLABS] keys in .env)

import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { generateOmniClip } from '../server/omni.js'
import { defaultGenAi } from '../server/genai.js'
import { loadReferenceImages } from '../server/images.js'
import { loadVoiceConfig, generateBeatSpeech } from '../server/speech.js'
import { BOOK_TITLE } from '../server/book.js'
import { COMMON_STYLE, VERSIONS } from './sample-prompts.mjs'

const EXCERPT_PATH = 'scripts/sample-pages/excerpt.txt'
const OUT_DIR = 'public/samples'
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json')
const MAX_REFERENCES = 8
const BEAT_COUNT = VERSIONS[0].prompts.length

// Script-local schema: verbatim beats plus dialogue-aware speech segments.
const EXCERPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'beats'],
  properties: {
    title: { type: 'string', description: 'short title for this excerpt/scene' },
    beats: {
      type: 'array',
      description: 'EXACTLY 3 sequential passages covering the excerpt in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'speech'],
        properties: {
          text: { type: 'string', description: 'verbatim sentence(s) from the excerpt' },
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

const EXCERPT_SYSTEM = `You split a children's book excerpt into passages for a picture-book
viewer. Split it into EXACTLY 3 sequential passages (verbatim text, in order), aligned with
these story moments:
  1. noticing the boy at the strangely clean table (reading, twirling a red pen)
  2. the whispered word ("Pumpernickel?")
  3. the boy looking up — the greenest green eyes
For each passage, split the text into voice segments: prose and attribution go to
"narrator"; quoted dialogue goes to "character-1" or "character-2" (assign each story
character one id, consistently; strip surrounding quotes). Infer delivery from the text
("...I whispered" -> whisper). ALL output in English.`

async function readExcerpt(client, excerpt) {
  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: EXCERPT_SCHEMA } },
    system: EXCERPT_SYSTEM,
    messages: [{ role: 'user', content: `The excerpt:\n"${excerpt}"` }],
  })
  const message = await stream.finalMessage()
  if (message.stop_reason === 'refusal') throw new Error('excerpt read refused')
  const scene = JSON.parse(message.content.find((b) => b.type === 'text').text)
  if (scene.beats.length !== BEAT_COUNT) {
    throw new Error(`expected ${BEAT_COUNT} beats, got ${scene.beats.length}`)
  }
  return scene
}

// Era versions whisper a period-fitting word — swap it into the spoken line
// so the TTS matches what the clip implies.
function speechForVersion(speech, version) {
  if (!version.dialogue) return speech
  return (speech ?? []).map((seg) =>
    seg.speaker !== 'narrator' && /pumpernickel/i.test(seg.text)
      ? { ...seg, text: version.dialogue }
      : seg,
  )
}

const toSamplesUrl = (mediaUrl) => `/samples/${path.basename(mediaUrl)}`

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  if (!fs.existsSync(EXCERPT_PATH)) {
    console.log(`No excerpt found — put the book excerpt into ${EXCERPT_PATH} first.`)
    return
  }
  const excerpt = fs.readFileSync(EXCERPT_PATH, 'utf8').trim()

  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')
  const references = loadReferenceImages().slice(0, MAX_REFERENCES)
  if (references.length === 0) {
    throw new Error('no reference images in public/images — the style anchor is required')
  }
  const voiceConfig = loadVoiceConfig()
  if (!voiceConfig) console.warn('ELEVENLABS keys missing — narration/dialogue audio will be skipped.')

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : { title: BOOK_TITLE, pages: [] }

  // One page: the excerpt. Resume from the manifest when it exists.
  let page = manifest.pages.find((p) => p.source === 'excerpt')
  if (!page) {
    console.log('reading the excerpt...')
    const scene = await readExcerpt(new Anthropic(), excerpt)
    page = {
      source: 'excerpt',
      sceneTitle: scene.title,
      // staging: the canonical (Original) video prompt for this moment — live
      // wish-transforms reuse it so they keep the same scene composition.
      beats: scene.beats.map((b, i) => ({
        text: b.text,
        speech: b.speech,
        staging: VERSIONS[0].prompts[i],
        versions: [],
      })),
    }
    manifest.pages.push(page)
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  }

  // Identical speech (all narration; shared dialogue) is voiced once and reused.
  const audioCache = new Map()
  let failures = 0

  for (const [i, beat] of page.beats.entries()) {
    for (const version of VERSIONS) {
      const existing = beat.versions.find((v) => v.id === version.id)
      if (existing?.clip) {
        console.log(`skip ${version.id} beat ${i + 1} (already generated)`)
        continue
      }
      console.log(`[beat ${i + 1}/${page.beats.length}] ${version.label}...`)
      try {
        const clipFile = await generateOmniClip({
          ai,
          prompt: `${COMMON_STYLE}\n\n${version.prompts[i]}`,
          references,
          duration: '8s',
          saveDir: OUT_DIR,
          basename: `clip-${version.id}-${i}`,
        })

        let audio = []
        const speech = speechForVersion(beat.speech, version)
        if (voiceConfig && speech.length) {
          const key = JSON.stringify(speech)
          if (!audioCache.has(key)) {
            const results = await generateBeatSpeech({
              scene: { beats: [{ text: beat.text, speech }] },
              config: voiceConfig,
              saveDir: OUT_DIR,
              emit: () => {},
            })
            audioCache.set(key, (results[0]?.urls ?? []).map(toSamplesUrl))
          }
          audio = audioCache.get(key)
        }

        const entry = { id: version.id, label: version.label, clip: `/samples/${clipFile}`, audio }
        if (existing) Object.assign(existing, entry)
        else beat.versions.push(entry)
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
        console.log(`  ✓ ${entry.clip}`)
      } catch (err) {
        failures += 1
        console.error(`  ✗ ${version.id} beat ${i + 1} failed:`, err?.message ?? err)
      }
    }
  }

  const total = page.beats.length * VERSIONS.length
  const done = page.beats.reduce((n, b) => n + b.versions.filter((v) => v.clip).length, 0)
  console.log(`done — ${done}/${total} clips in manifest at ${MANIFEST_PATH}`)
  if (failures) console.log('rerun `npm run make-samples` to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
