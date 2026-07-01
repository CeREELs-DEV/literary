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
    // durationSeconds must be a NUMBER — the API rejects string values.
    config: { durationSeconds: 8, resolution: '720p', aspectRatio: '16:9' },
  })

  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }

  const filename = `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  const downloadPath = path.join(saveDir, filename)
  await ai.files.download({
    file: operation.response.generatedVideos[0].video,
    downloadPath,
  })

  const url = `/api/media/${filename}`
  emit({ type: 'clip', url })
  return url
}

// Animate every beat illustration into its own clip, in parallel.
// Emits an indexed clip event as each finishes; one failure doesn't sink the rest.
export async function generateBeatClips({ scene, images, emit, ai, saveDir, sleep }) {
  const results = await Promise.allSettled(
    images.map(async ({ index, src }) => {
      const url = await generateSceneClip({
        imageBase64: src.slice(src.indexOf(',') + 1),
        mimeType: src.slice(5, src.indexOf(';')),
        prompt:
          `${scene.beats[index].amplifiedCaption}. ` +
          `Cinematic children's storybook animation, gentle camera movement, matching the illustration's art style.`,
        emit: () => {}, // suppress the un-indexed event; we emit an indexed one below
        ai,
        saveDir,
        ...(sleep ? { sleep } : {}),
      })
      emit({ type: 'clip', index, url })
      return { index, url }
    }),
  )
  const failed = results.filter((r) => r.status === 'rejected')
  for (const f of failed) console.error('beat clip failed:', f.reason?.message ?? f.reason)
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}
