// server/film.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

// Choose the beat to film: Claude's keyBeatIndex when valid and illustrated,
// else the most impactful illustrated beat (high shake), else the first illustration.
export function pickKeyBeat(scene, images) {
  const has = (i) => images.some((img) => img.index === i)
  const k = scene.keyBeatIndex
  if (Number.isInteger(k) && k >= 0 && k < scene.beats.length && has(k)) return k
  const shaky = scene.beats.findIndex(
    (b, i) =>
      has(i) && (b.effects ?? []).some((e) => e.type === 'shake' && e.intensity === 'high'),
  )
  if (shaky >= 0) return shaky
  if (images.length === 0) return -1
  return [...images].sort((a, b) => a.index - b.index)[0].index
}

function isQuotaError(err) {
  const msg = String(err?.message ?? err)
  return msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')
}

async function awaitOperation(ai, operation, sleep) {
  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }
  return operation
}

// Film ONE key scene — the single moment that most rewards a child's visual
// imagination. The rest of the passage stays in the reader's head by design.
export async function generateFilm({
  scene,
  images,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const keyIndex = pickKeyBeat(scene, images)
  if (keyIndex < 0) return null
  const image = images.find((img) => img.index === keyIndex)
  const beat = scene.beats[keyIndex]

  emit({ type: 'status', stage: 'animating', label: 'Filming the key scene...' })

  // Claude designs the motion (only what is already in the frame may move);
  // the amplified caption is a fallback for scenes generated before motionPrompt.
  const motion = beat.motionPrompt ?? beat.amplifiedCaption
  const request = (model) =>
    ai.models.generateVideos({
      model,
      prompt:
        `Animate this exact illustration — it is the first frame and its art style is the law. ` +
        `Preserve the characters, linework, color palette, and composition unchanged; do not ` +
        `restyle, redraw, or add realism. Nothing new may enter the frame: no new objects, ` +
        `walls, structures, or characters may appear, form, or morph. ` +
        `Only this gentle, physically plausible motion: ${motion}`,
      image: {
        imageBytes: image.src.slice(image.src.indexOf(',') + 1),
        mimeType: image.src.slice(5, image.src.indexOf(';')),
      },
      config: {
        durationSeconds: 8,
        resolution: '720p',
        aspectRatio: '16:9',
        // The lite model rejects negativePrompt (400) — fast only.
        ...(model === 'veo-3.1-fast-generate-preview'
          ? {
              negativePrompt:
                'new objects appearing, structures materializing, walls forming, morphing, ' +
                'warping, extra characters, scene change, style change, photorealism, ' +
                'distortion, glitches, text',
            }
          : {}),
      },
    })

  let operation
  try {
    operation = await request('veo-3.1-fast-generate-preview')
  } catch (err) {
    if (!isQuotaError(err)) throw err
    // Quotas are per-model — the lite pool may still be open when fast is spent.
    console.warn('fast model quota exhausted, retrying with lite:', err?.message ?? err)
    emit({ type: 'status', stage: 'animating', label: 'Retrying with a lighter film model...' })
    operation = await request('veo-3.1-lite-generate-preview')
  }
  operation = await awaitOperation(ai, operation, sleep)

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    throw new Error(operation.error?.message ?? 'Veo operation returned no video')
  }

  const filename = `film-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })

  const url = `/api/media/${filename}`
  emit({ type: 'film', url, index: keyIndex })
  return url
}
