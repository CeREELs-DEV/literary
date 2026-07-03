// scripts/make-curated-videos.mjs
//
// INTERNAL PRODUCTION SCRIPT — pre-produce the Imagination Player films.
// Students never trigger this; it runs at authoring time.
//
// Two stages per film, because Omni follows a first frame far more
// faithfully than style-reference images:
//   1. Nano Banana paints the OPENING FRAME from the public/images style
//      references plus the previously painted frames (cut-to-cut
//      consistency) -> public/curated/<id>.jpg (also the player's poster)
//   2. Gemini Omni animates that exact frame -> public/curated/<id>.mp4
// Existing mp4s are kept (resumable). Usage: npm run make-curated-videos

import fs from 'node:fs'
import path from 'node:path'
import { generateOmniClip } from '../server/omni.js'
import { defaultGenAi } from '../server/genai.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from '../server/images.js'
import { CURATED_STYLE, SCENE_BIBLE, CURATED_SCENES } from './curated-scenes.mjs'

const OUT_DIR = 'public/curated'
const MAX_REFERENCES = 8

async function paintOpeningFrame({ ai, scene, styleRefs, previousFrames }) {
  const prompt =
    `${CURATED_STYLE}\n\n${SCENE_BIBLE}\n\n` +
    (previousFrames.length
      ? `The last ${previousFrames.length} attached image(s) are the ` +
        `IMMEDIATELY PRECEDING shots of this very story — the same children, ` +
        `outfits, courtyard, and light. Continue them exactly. \n\n`
      : '') +
    `Paint the OPENING FRAME (the very first frame) of this shot: ` +
    `${scene.internalOmniPrompt}\nNo text or letters in the image.`
  const parts = [...styleRefs, ...previousFrames].map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const generate = async (model) => {
    const interaction = await ai.interactions.create({
      model,
      input: [{ type: 'text', text: prompt }, ...parts],
      response_format: { type: 'image', aspect_ratio: '16:9' },
    })
    const data = interaction?.output_image?.data
    if (!data) throw new Error('no image data in response')
    return data
  }
  try {
    return await generate(PRO_MODEL)
  } catch {
    return await generate(LITE_MODEL)
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')
  const styleRefs = loadReferenceImages().slice(0, MAX_REFERENCES)
  if (styleRefs.length === 0) throw new Error('no reference images in public/images')

  // Rolling window of freshly painted frames — cut-to-cut consistency.
  const previousFrames = []

  let failures = 0
  for (const scene of CURATED_SCENES) {
    const mp4 = path.join(OUT_DIR, `${scene.id}.mp4`)
    const jpg = path.join(OUT_DIR, `${scene.id}.jpg`)
    if (fs.existsSync(mp4)) {
      console.log(`skip ${scene.id} (already produced)`)
      if (fs.existsSync(jpg)) {
        previousFrames.push({
          data: fs.readFileSync(jpg).toString('base64'),
          mimeType: 'image/jpeg',
        })
        if (previousFrames.length > 3) previousFrames.shift()
      }
      continue
    }
    console.log(`producing ${scene.id} (${scene.viewpoint})...`)
    try {
      // 1) The opening frame carries the style and the continuity.
      const frameData = await paintOpeningFrame({
        ai, scene, styleRefs, previousFrames: previousFrames.slice(-3),
      })
      const frameMime = sniffImageMime(frameData)
      fs.writeFileSync(jpg, Buffer.from(frameData, 'base64'))
      console.log(`  ✓ frame /curated/${scene.id}.jpg`)

      // 2) Omni animates that exact frame.
      const prompt =
        `The attached illustration is the FIRST FRAME of this shot — its art ` +
        `style, characters, and composition are the law: do not restyle, ` +
        `redraw, or add realism; no new objects, terrain, or characters may ` +
        `appear; keep correct anatomy (two arms per person). ` +
        `Animate it gently, ~8 seconds: ${scene.internalOmniPrompt}`
      await generateOmniClip({
        ai,
        prompt,
        references: [{ data: frameData, mimeType: frameMime }],
        duration: '8s',
        saveDir: OUT_DIR,
        basename: scene.id,
      })
      previousFrames.push({ data: frameData, mimeType: frameMime })
      if (previousFrames.length > 3) previousFrames.shift()
      console.log(`  ✓ /curated/${scene.id}.mp4`)
    } catch (err) {
      failures += 1
      console.error(`  ✗ ${scene.id} failed:`, err?.message ?? err)
    }
  }
  const produced = CURATED_SCENES.filter((s) =>
    fs.existsSync(path.join(OUT_DIR, `${s.id}.mp4`)),
  ).length
  console.log(`done — ${produced}/${CURATED_SCENES.length} films in ${OUT_DIR}`)
  if (failures) console.log('rerun `npm run make-curated-videos` to retry the failed ones.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
