// server/images.js
import fs from 'node:fs'
import path from 'node:path'

const MIME_BY_EXT = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

// Cap on reference images sent to the API per request (loadReferenceImages may load more).
const MAX_REFERENCES = 8

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

// Detect the actual encoding of generated image bytes (the API may return JPEG or PNG).
export function sniffImageMime(base64) {
  return base64.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
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
  const referenceParts = references.slice(0, MAX_REFERENCES).map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const generateOne = async (beat, index) => {
    const interaction = await ai.interactions.create({
      model: 'gemini-3.1-flash-lite-image',
      input: [{ type: 'text', text: beatPrompt(scene, beat) }, ...referenceParts],
      response_format: { type: 'image', aspect_ratio: '16:9' },
    })
    const data = interaction?.output_image?.data
    if (!data) {
      // Diagnosable failure on API-shape drift instead of a silent black screen.
      console.warn(`no image data in response for beat ${index}`)
      throw new Error(`no image data in response for beat ${index}`)
    }
    return data
  }

  const results = await Promise.allSettled(
    scene.beats.map(async (beat, index) => {
      // Retry once: a single transient failure shouldn't drop a beat's illustration.
      let data
      try {
        data = await generateOne(beat, index)
      } catch {
        data = await generateOne(beat, index)
      }
      const src = `data:${sniffImageMime(data)};base64,${data}`
      emit({ type: 'image', index, src })
      return { index, src }
    }),
  )
  for (const f of results.filter((r) => r.status === 'rejected')) {
    console.error('beat image failed:', f.reason?.message ?? f.reason)
  }
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
}
