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

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt:
      `A key moment from an animated children's storybook film titled "${scene.title}": ` +
      `${beat.amplifiedCaption}. Cinematic 2D storybook animation, gentle camera movement, ` +
      `matching the illustration's art style.`,
    image: {
      imageBytes: image.src.slice(image.src.indexOf(',') + 1),
      mimeType: image.src.slice(5, image.src.indexOf(';')),
    },
    config: { durationSeconds: 8, resolution: '720p', aspectRatio: '16:9' },
  })
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
