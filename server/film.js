// server/film.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

const NEGATIVE_PROMPT =
  'new objects appearing, structures materializing, walls forming, morphing, ' +
  'warping, extra characters, scene change, style change, photorealism, ' +
  'distortion, glitches, text'

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

function filmPrompt(keyBeat, imagining) {
  return (
    `This is one moment from a children's story: "${keyBeat.text}" — seen ` +
    `${imagining.perspective}. Animate this exact illustration as that moment unfolds. ` +
    `The illustration is the first frame and its art style is the law: preserve the ` +
    `characters, linework, color palette, and composition; do not restyle, redraw, or add ` +
    `realism. Nothing new may enter the frame: no new objects, walls, structures, or ` +
    `characters may appear, form, or morph. The motion must follow the story's spatial ` +
    `and emotional logic exactly: ${imagining.motionPrompt}`
  )
}

// Generate one clip. Lite is the primary model (its quota pool is the one we
// actually have); quotas are per-model, so fast serves as the backup pool.
async function filmOne({ ai, prompt, image, saveDir, sleep }) {
  const request = (model) =>
    ai.models.generateVideos({
      model,
      prompt,
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
          ? { negativePrompt: NEGATIVE_PROMPT }
          : {}),
      },
    })

  let operation
  try {
    operation = await request('veo-3.1-lite-generate-preview')
  } catch (err) {
    if (!isQuotaError(err)) throw err
    console.warn('lite model quota exhausted, retrying with fast:', err?.message ?? err)
    operation = await request('veo-3.1-fast-generate-preview')
  }
  operation = await awaitOperation(ai, operation, sleep)

  const video = operation.response?.generatedVideos?.[0]?.video
  if (!video) {
    throw new Error(operation.error?.message ?? 'Veo operation returned no video')
  }

  const filename = `film-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })
  return `/api/media/${filename}`
}

// Rashomon mode: film each imagining of the key scene, sequentially (quota-
// gentle). A failed imagining is skipped — the cinema falls back to showing
// its illustration instead, so one bad generation never sinks the show.
export async function generateImaginingFilms({
  scene,
  imaginingImages,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const imaginings = scene.imaginings ?? []
  const keyBeat = scene.beats[scene.keyBeatIndex] ?? scene.beats[0]
  if (imaginings.length === 0 || !keyBeat) return []

  const total = imaginings.length
  const films = []
  for (const [index, imagining] of imaginings.entries()) {
    const image = imaginingImages.find((img) => img.index === index)
    if (!image) continue
    emit({
      type: 'status',
      stage: 'animating',
      label: `Filming imagination ${index + 1}/${total}...`,
    })
    try {
      const url = await filmOne({
        ai,
        prompt: filmPrompt(keyBeat, imagining),
        image,
        saveDir,
        sleep,
      })
      emit({ type: 'imagining-film', index, url })
      films.push({ index, url })
    } catch (err) {
      console.error(`imagining ${index} film failed:`, err?.message ?? err)
    }
  }
  return films
}
