// server/omni.js
import fs from 'node:fs'
import path from 'node:path'

// Gemini Omni Flash: video generation through the same interactions API that
// Nano Banana uses for images — text + reference images in, an mp4 out.
export const OMNI_MODEL = 'gemini-omni-flash-preview'

const POLL_INTERVAL_MS = 10_000
const PENDING = new Set(['queued', 'in_progress'])

// Generate one clip and save it under saveDir; returns the saved filename.
export async function generateOmniClip({
  ai,
  prompt,
  references = [],
  duration = '8s',
  saveDir,
  basename,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  fetchImpl = fetch,
}) {
  if (!ai) throw new Error('Video generation is unavailable (GEMINI_API_KEY missing).')

  let interaction = await ai.interactions.create({
    model: OMNI_MODEL,
    background: true, // video generation is long-running; poll for completion
    input: [
      { type: 'text', text: prompt },
      ...references.map((ref) => ({
        type: 'image',
        mime_type: ref.mimeType,
        data: ref.data,
      })),
    ],
    response_format: {
      type: 'video',
      aspect_ratio: '16:9',
      duration,
      delivery: 'inline',
    },
  })

  while (PENDING.has(interaction.status)) {
    await sleep(POLL_INTERVAL_MS)
    interaction = await ai.interactions.get(interaction.id)
  }
  if (interaction.status && interaction.status !== 'completed') {
    throw new Error(
      `Omni Flash ${interaction.status}: ${interaction.error?.message ?? 'no detail'}`,
    )
  }

  const video = interaction.output_video
  let bytes = null
  if (video?.data) {
    bytes = Buffer.from(video.data, 'base64')
  } else if (video?.uri) {
    const res = await fetchImpl(video.uri)
    if (!res.ok) throw new Error(`video download failed (${res.status})`)
    bytes = Buffer.from(await res.arrayBuffer())
  }
  if (!bytes) throw new Error('Omni Flash returned no video')

  const filename = `${basename}.mp4`
  fs.mkdirSync(saveDir, { recursive: true })
  fs.writeFileSync(path.join(saveDir, filename), bytes)
  return filename
}
