// server/film.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

function filmPrompt(scene, beat, isFirst) {
  const opening = isFirst
    ? `Opening scene of an animated children's storybook film titled "${scene.title}"`
    : 'The film continues seamlessly into the next scene'
  return (
    `${opening}: ${beat.amplifiedCaption}. ` +
    `Cinematic 2D storybook animation, gentle camera movement, ` +
    `consistent characters and art style throughout.`
  )
}

async function awaitOperation(ai, operation, sleep) {
  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }
  return operation
}

// Build one continuous film: image-to-video for the first beat, then one
// scene extension (+7s) per remaining beat. Each extension returns the full
// combined video, so only the final one is downloaded.
export async function generateFilm({
  scene,
  images,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const sorted = [...images].sort((a, b) => a.index - b.index)
  const first = sorted[0]
  if (!first) return null

  const total = scene.beats.length
  emit({ type: 'status', stage: 'animating', label: `Filming scene 1/${total}...` })

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: filmPrompt(scene, scene.beats[first.index], true),
    image: {
      imageBytes: first.src.slice(first.src.indexOf(',') + 1),
      mimeType: first.src.slice(5, first.src.indexOf(';')),
    },
    config: { durationSeconds: 8, resolution: '720p', aspectRatio: '16:9' },
  })
  operation = await awaitOperation(ai, operation, sleep)
  let video = operation.response.generatedVideos[0].video

  for (let i = 1; i < total; i += 1) {
    emit({ type: 'status', stage: 'animating', label: `Filming scene ${i + 1}/${total}...` })
    let op = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: filmPrompt(scene, scene.beats[i], false),
      video,
      config: { numberOfVideos: 1, resolution: '720p' },
    })
    op = await awaitOperation(ai, op, sleep)
    video = op.response.generatedVideos[0].video
  }

  const filename = `film-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })

  const url = `/api/media/${filename}`
  emit({ type: 'film', url })
  return url
}
