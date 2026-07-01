// server/video.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

// Animate the hero illustration into a short clip (Veo 3.1 Fast, native audio).
// Downloads the mp4 into saveDir and emits its /api/media URL.
export async function generateSceneClip({
  imageBase64,
  mimeType = 'image/png',
  prompt,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: { imageBytes: imageBase64, mimeType },
    config: { durationSeconds: '8', resolution: '720p', aspectRatio: '16:9' },
  })

  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }

  const filename = `clip-${Date.now()}.mp4`
  const downloadPath = path.join(saveDir, filename)
  await ai.files.download({
    file: operation.response.generatedVideos[0].video,
    downloadPath,
  })

  const url = `/api/media/${filename}`
  emit({ type: 'clip', url })
  return url
}
