// scripts/make-lab-thumbs.mjs
//
// Pre-generate the Literary Image Lab's visual anchors: one illustration per
// mission x hypothesis (6 x 3 = 18), rendered from the same deterministic
// prompts the lab builds, so what students see matches what their choices
// produce. Saved under public/lab/ with a manifest; existing files are kept
// (resumable). Usage: npm run make-lab-thumbs
import fs from 'node:fs'
import path from 'node:path'
import { illustratePrompt } from '../server/illustrate.js'
import { MISSIONS, HYPOTHESES } from '../src/lab-data.js'
import { buildPrompt, defaultSelection } from '../src/lab.js'

const OUT_DIR = 'public/lab'
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json')

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : {}
  let failures = 0

  for (const mission of MISSIONS) {
    manifest[mission.id] ??= {}
    for (const hypothesis of HYPOTHESES) {
      const file = `thumb-${mission.id}-${hypothesis.id}.jpg`
      if (manifest[mission.id][hypothesis.id] && fs.existsSync(path.join(OUT_DIR, file))) {
        console.log(`skip ${file}`)
        continue
      }
      console.log(`painting ${mission.title} / ${hypothesis.label}...`)
      try {
        const prompt = buildPrompt({ ...defaultSelection(mission.id), hypothesis: hypothesis.id })
        const src = await illustratePrompt({ prompt })
        fs.writeFileSync(
          path.join(OUT_DIR, file),
          Buffer.from(src.slice(src.indexOf(',') + 1), 'base64'),
        )
        manifest[mission.id][hypothesis.id] = `/lab/${file}`
        fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
        console.log(`  ✓ /lab/${file}`)
      } catch (err) {
        failures += 1
        console.error(`  ✗ failed:`, err?.message ?? err)
      }
    }
  }
  const total = MISSIONS.length * HYPOTHESES.length
  const done = Object.values(manifest).reduce((n, m) => n + Object.keys(m).length, 0)
  console.log(`done — ${done}/${total} thumbs at ${MANIFEST_PATH}`)
  if (failures) console.log('rerun `npm run make-lab-thumbs` to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
