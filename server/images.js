// server/images.js
import fs from 'node:fs'
import path from 'node:path'

const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

const DEFAULT_REFERENCE_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..',
  'public',
  'images',
)

// Load ALL user-provided art-style reference images from public/images.
// Returns [] when none are present (visual stages are then skipped).
export function loadReferenceImages(dir = DEFAULT_REFERENCE_DIR) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((name) => MIME_BY_EXT[path.extname(name).toLowerCase()])
    .sort()
    .map((name) => ({
      data: fs.readFileSync(path.join(dir, name)).toString('base64'),
      mimeType: MIME_BY_EXT[path.extname(name).toLowerCase()],
    }))
}

function beatPrompt(scene, beat) {
  return (
    `The attached reference images show the characters and art style of a children's story ` +
    `titled "${scene.title}". Illustrate this moment in EXACTLY that art style, palette, and ` +
    `linework, reusing those characters where they fit: ${beat.amplifiedCaption}. ` +
    `Wide cinematic composition. No text or letters in the image.`
  )
}

// Generate one illustration per beat (Nano Banana 2 Lite), emitting each as it completes.
export async function generateBeatImages({ scene, references, emit, ai }) {
  const referenceParts = references.map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const results = await Promise.allSettled(
    scene.beats.map(async (beat, index) => {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-flash-lite-image',
        input: [{ type: 'text', text: beatPrompt(scene, beat) }, ...referenceParts],
        response_format: { type: 'image', aspect_ratio: '16:9' },
      })
      const src = `data:image/png;base64,${interaction.output_image.data}`
      emit({ type: 'image', index, src })
      return { index, src }
    }),
  )
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
}
