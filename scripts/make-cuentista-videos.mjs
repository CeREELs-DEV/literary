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

const CLIPS = [
  {
    id: 'cuentista-1a',
    first: '1a-first.jpg',
    last: '1a-last.jpg',
    prompt:
      'Animate between the two frames, keeping their exact flat cartoon art style ' +
      'from the first second to the last — no style change. The two children walk ' +
      'away from the camera down the shaded cedar forest trail toward the light at ' +
      'its end; the camera follows smoothly behind them at walking pace; they step ' +
      'out of the tree line into a wide open field of green grass as an enormous ' +
      'chrome-and-crystal praying-mantis spacecraft is revealed, towering over the ' +
      'field. Audio: soft footsteps on dirt, forest birdsong fading, a low deep ' +
      'hum swelling as the ship comes into view.',
  },
  {
    id: 'cuentista-1b',
    first: '1b-first.jpg',
    last: '1b-last.jpg',
    prompt:
      'Animate between the two frames, keeping their exact flat cartoon art style ' +
      'throughout — no style change. The younger boy skids to a stop on the dirt, ' +
      'gripping his older sister’s wrist; the camera pushes in slowly on his face ' +
      'as he tilts his head up, eyes going wide; behind and above him the towering ' +
      'chrome-and-crystal praying-mantis ship fills the sky. Audio: shoes skidding ' +
      'on dirt, a small sharp inhale, wind, a low resonant ship hum.',
  },
  {
    id: 'cuentista-2',
    first: '2-first.jpg',
    last: '2-last.jpg',
    prompt:
      'A slow, dreamy cross-dissolve between the two frames, keeping each frame’s ' +
      'flat cartoon art style — no photorealism. From the girl’s distant, faraway ' +
      'gaze in the cold steel-and-crystal light, the scene melts into her warm ' +
      'memory: two elderly women under a red-and-black fringed blanket leaning ' +
      'against a great old pecan tree at golden hour, one pouring from a brown ' +
      'glass bottle into a clay mug, steam rising; they clink mugs and lean ' +
      'shoulder to shoulder. Audio: a cold hum fading into warm breeze, soft ' +
      'birdsong, gentle laughter, the clink of clay mugs.',
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
      'enormous chrome-and-crystal praying-mantis spacecraft, the comet still ' +
      'overhead. Audio: wind over grass, distant unhurried footsteps, a long low ' +
      'hum from the ship.',
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
