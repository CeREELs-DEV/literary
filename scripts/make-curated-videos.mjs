// scripts/make-curated-videos.mjs
//
// INTERNAL PRODUCTION SCRIPT — pre-produce the Imagination Player videos
// with Gemini Omni. Students never trigger this; it runs at authoring time.
// Videos land in public/curated/<scene-id>.mp4 (the URLs the student page
// already points at); existing files are kept (resumable).
//
// Usage: npm run make-curated-videos   (requires GEMINI_API_KEY in .env)

import fs from 'node:fs'
import path from 'node:path'
import { generateOmniClip } from '../server/omni.js'
import { defaultGenAi } from '../server/genai.js'
import { loadReferenceImages } from '../server/images.js'
import { CURATED_STYLE, CURATED_SCENES } from './curated-scenes.mjs'

const OUT_DIR = 'public/curated'
const MAX_REFERENCES = 3

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')
  const references = loadReferenceImages().slice(0, MAX_REFERENCES)

  let failures = 0
  for (const scene of CURATED_SCENES) {
    const file = path.join(OUT_DIR, `${scene.id}.mp4`)
    if (fs.existsSync(file)) {
      console.log(`skip ${scene.id} (already produced)`)
      continue
    }
    console.log(`producing ${scene.id} (${scene.viewpoint})...`)
    try {
      await generateOmniClip({
        ai,
        prompt: `${CURATED_STYLE}\n\n${scene.internalOmniPrompt}`,
        references,
        duration: '8s',
        saveDir: OUT_DIR,
        basename: scene.id,
      })
      console.log(`  ✓ /curated/${scene.id}.mp4`)
    } catch (err) {
      failures += 1
      console.error(`  ✗ ${scene.id} failed:`, err?.message ?? err)
    }
  }
  const produced = CURATED_SCENES.filter((s) =>
    fs.existsSync(path.join(OUT_DIR, `${s.id}.mp4`)),
  ).length
  console.log(`done — ${produced}/${CURATED_SCENES.length} videos in ${OUT_DIR}`)
  if (failures) console.log('rerun `npm run make-curated-videos` to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
