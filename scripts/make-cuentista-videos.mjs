// scripts/make-cuentista-videos.mjs
//
// INTERNAL PRODUCTION SCRIPT — The Last Cuentista films.
// The keyframes were authored by hand with Nano Banana Pro (first/last
// frame pairs in production/cuentista-keyframes/); this script has Veo 3.1
// interpolate each pair into an 8s clip (first frame = `image`, last frame
// = `config.lastFrame`), with motion/camera/audio described in the prompt.
// Results land in public/curated/cuentista-<id>.mp4 (+ the first frame is
// copied as the player poster). Existing mp4s are kept (resumable).
//
// Usage: npm run make-cuentista-videos   (requires GEMINI_API_KEY in .env)

import fs from 'node:fs'
import path from 'node:path'
import { defaultGenAi } from '../server/genai.js'

const KEY_DIR = 'production/cuentista-keyframes'
const OUT_DIR = 'public/curated'
const POLL_INTERVAL_MS = 10_000

// Quotas are per-model — walk the chain when one pool is spent.
const VIDEO_MODELS = [
  'veo-3.1-generate-preview',
  'veo-3.1-fast-generate-preview',
  'veo-3.1-lite-generate-preview',
]

// The mantis ship is a MACHINE: Veo loves to animate it like a living
// insect, so every prompt carries this contract explicitly.
const MANTIS_STILL =
  ' IMPORTANT: the praying-mantis spacecraft is a parked, lifeless MACHINE ' +
  'and must stay PERFECTLY STILL for the entire clip — no leg movement, no ' +
  'head movement, no swaying, no breathing, no insect behavior of any kind. ' +
  'Only the people, grass, clouds, light, and the comet may move. The ship ' +
  'keeps the EXACT same chrome-and-crystal mantis design, silhouette, and ' +
  'pose from both keyframes in every in-between frame — it must NEVER morph ' +
  'into an airplane, jet, spider, robot, mech, or any other vehicle or ' +
  'creature, and it never gains wings, landing gear, eyes, or a face.'

const FPV =
  'The camera is the character\u2019s own eyes: strict first-person, gentle ' +
  'handheld sway at walking rhythm, the character never appears on screen. '

const CLIPS = [
  // ---- Camera (third-person) ----
  {
    id: 'cuentista-1a',
    first: '1a-first.jpg',
    last: '1a-last.jpg',
    prompt:
      'Animate between the two frames, keeping their exact flat cartoon art style ' +
      'from the first second to the last — no style change. The two children walk ' +
      'away from the camera down the shaded cedar forest trail toward the light at ' +
      'its end; the camera follows smoothly behind them at walking pace; they step ' +
      'out of the tree line into a wide open field of green grass where the ' +
      'enormous chrome-and-crystal praying-mantis spacecraft stands revealed, its ' +
      'tiny identical twin far across the horizon. Audio: soft footsteps on dirt, ' +
      'forest birdsong fading, a low deep hum swelling as the ship comes into ' +
      'view.' + MANTIS_STILL,
  },
  {
    id: 'cuentista-2',
    first: '2-first.jpg',
    last: '2-last.jpg',
    prompt:
      'A slow, dreamy cross-dissolve between the two frames, keeping each frame\u2019s ' +
      'flat cartoon art style — no photorealism. From the girl\u2019s distant, faraway ' +
      'gaze in the cold overcast field, the scene melts into her warm memory: two ' +
      'elderly women under a red-and-black fringed blanket leaning against a great ' +
      'old pecan tree at golden hour, one pouring from a brown glass bottle into a ' +
      'clay mug, steam rising; they clink mugs and lean shoulder to shoulder while ' +
      'a gentle green snake glides home through the golden grass far behind. ' +
      'Audio: a cold hum fading into warm breeze, soft birdsong, gentle laughter, ' +
      'the clink of clay mugs.',
  },
  {
    id: 'cuentista-3',
    first: '3-first.jpg',
    last: '3-last.jpg',
    prompt:
      'Animate between the two frames, keeping their exact flat cartoon art style ' +
      'throughout — no style change. The girl glares up at the bright comet ' +
      'streaking across the pale sky; the camera pulls back and rises steadily, ' +
      'revealing the vast green field as she joins her family and a few ' +
      'scientists walking in a quiet, orderly line — small as ants — toward the ' +
      'enormous parked chrome-and-crystal praying-mantis spacecraft, the comet ' +
      'still overhead. Audio: wind over grass, distant unhurried footsteps, a ' +
      'long low hum from the ship.' + MANTIS_STILL,
  },
  // ---- Petra, strict first person ----
  {
    id: 'cuentista-p1',
    first: 'p1-first.jpg',
    last: 'p1-last.jpg',
    prompt:
      FPV +
      'Through the teenage girl\u2019s eyes: walking the shaded cedar trail toward ' +
      'the light, her little brother a step ahead at the frame\u2019s edge; the view ' +
      'emerges from the trees onto the vast green field and tilts slightly up as ' +
      'the enormous parked mantis spacecraft is revealed towering across the ' +
      'field, its twin tiny on the horizon; at the last moment her brother\u2019s ' +
      'small hand grips her wrist at the bottom corner. Audio: footsteps on ' +
      'dirt, birdsong fading, a whispered \u201cPetra\u2026?\u201d, a low hum swelling.' +
      MANTIS_STILL,
  },
  {
    id: 'cuentista-p2',
    first: 'p2-first.jpg',
    last: '2-last.jpg',
    prompt:
      FPV +
      'Through the teenage girl\u2019s eyes, the field ahead going soft and ' +
      'unfocused as her mind drifts — then a slow, warm cross-dissolve into the ' +
      'memory she chooses to keep: the two elderly women under the fringed ' +
      'blanket against the old pecan tree at golden hour, pouring, clinking clay ' +
      'mugs, leaning shoulder to shoulder, the gentle green snake gliding home ' +
      'far behind. Keep both frames\u2019 flat cartoon style. Audio: wind fading ' +
      'into warm breeze, soft laughter, the clink of mugs.',
  },
  {
    id: 'cuentista-p3',
    first: 'p3-first.jpg',
    last: 'p3-last.jpg',
    prompt:
      FPV +
      'Through the teenage girl\u2019s eyes: first glaring up at the bright comet ' +
      'crossing the pale sky — the view holds on it, trembling slightly with ' +
      'resentment — then the gaze drops back to ground level and keeps walking: ' +
      'ahead, the quiet single line of walkers crosses the fresh-cut grass ' +
      'toward the enormous parked mantis ship, her own arm reaching from the ' +
      'bottom edge to rest a hand on her little brother\u2019s shoulder as he ' +
      'walks just ahead. Audio: wind, her slow exhale, distant footsteps, a ' +
      'low hum.' + MANTIS_STILL,
  },
  // ---- Javier, strict first person ----
  {
    id: 'cuentista-j1',
    first: 'j1-first.jpg',
    last: 'j1-last.jpg',
    prompt:
      FPV +
      'Through the young boy\u2019s eyes at a child\u2019s low height: the view skids ' +
      'to a halt at the forest\u2019s edge — a jolt, dust at the bottom edge — his ' +
      'small hand shoots out and grabs his sister\u2019s wrist; then the view cranes ' +
      'slowly, steeply upward until the enormous parked mantis spacecraft fills ' +
      'the whole sky above. Audio: sneakers skidding on dirt, a sharp little ' +
      'inhale, \u201cPetra\u2026?\u201d whispered, a deep resonant hum.' + MANTIS_STILL,
  },
  {
    id: 'cuentista-j2',
    first: 'j2-first.jpg',
    last: 'javier-b2-last.jpg',
    prompt:
      FPV +
      'Through the young boy\u2019s eyes while walking: he glances sideways and up ' +
      'at his older sister half a step ahead — she has gone completely quiet, ' +
      'her eyes far away; the view drifts gently closer as his small hand ' +
      'tightens around hers at the bottom edge, and a faint warm light passes ' +
      'across her quiet profile like a good memory moving through her. Audio: ' +
      'wind over grass, two sets of soft footsteps, a distant low hum.' +
      MANTIS_STILL,
  },
  {
    id: 'cuentista-j3',
    first: 'j3-first.jpg',
    last: 'j3-last.jpg',
    prompt:
      FPV +
      'Through the young boy\u2019s eyes inside the quiet walking line, holding his ' +
      'sister\u2019s hand: the line moves steadily forward across the fresh-cut ' +
      'grass, and as they arrive the gaze tilts steeply up — the parked mantis ' +
      'spacecraft\u2019s chrome-and-crystal body and one planted crystalline leg ' +
      'fill the sky overhead, the walkers passing tiny beneath. Audio: unhurried ' +
      'footsteps in grass, wind, a deep hum growing closer.' + MANTIS_STILL,
  },
]

const isQuotaError = (err) => {
  const msg = String(err?.message ?? err)
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')
}

const loadFrame = (name) => ({
  imageBytes: fs.readFileSync(path.join(KEY_DIR, name)).toString('base64'),
  mimeType: 'image/jpeg',
})

async function produce(ai, clip) {
  const request = (model) =>
    ai.models.generateVideos({
      model,
      prompt: clip.prompt,
      image: loadFrame(clip.first),
      config: {
        lastFrame: loadFrame(clip.last),
        durationSeconds: 8,
        resolution: '720p',
        aspectRatio: '16:9',
      },
    })

  let operation = null
  for (const [i, model] of VIDEO_MODELS.entries()) {
    try {
      operation = await request(model)
      break
    } catch (err) {
      if (!isQuotaError(err) || i === VIDEO_MODELS.length - 1) throw err
      console.warn(`  ${model} quota exhausted, trying ${VIDEO_MODELS[i + 1]}`)
    }
  }
  while (!operation.done) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    operation = await ai.operations.getVideosOperation({ operation })
  }
  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    const filtered = operation.response?.raiMediaFilteredReasons
    throw new Error(
      operation.error?.message ??
        (filtered?.length
          ? `Veo filtered the video: ${JSON.stringify(filtered)}`
          : 'Veo operation returned no video'),
    )
  }
  await ai.files.download({ file: video, downloadPath: path.join(OUT_DIR, `${clip.id}.mp4`) })
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')

  let failures = 0
  for (const clip of CLIPS) {
    const mp4 = path.join(OUT_DIR, `${clip.id}.mp4`)
    const poster = path.join(OUT_DIR, `${clip.id}.jpg`)
    if (fs.existsSync(mp4)) {
      console.log(`skip ${clip.id} (already produced)`)
      continue
    }
    console.log(`producing ${clip.id} (${clip.first} -> ${clip.last})...`)
    try {
      await produce(ai, clip)
      fs.copyFileSync(path.join(KEY_DIR, clip.first), poster)
      console.log(`  ✓ /curated/${clip.id}.mp4`)
    } catch (err) {
      failures += 1
      console.error(`  ✗ ${clip.id} failed:`, err?.message ?? err)
    }
  }
  const produced = CLIPS.filter((c) => fs.existsSync(path.join(OUT_DIR, `${c.id}.mp4`))).length
  console.log(`done — ${produced}/${CLIPS.length} films in ${OUT_DIR}`)
  if (failures) console.log('rerun `npm run make-cuentista-videos` to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
