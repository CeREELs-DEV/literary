// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')

async function playScene(rawScene) {
  const scene = validateScene(rawScene)
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
  const engine = createTimelineEngine({ stage })
  await engine.play(scene)
}

startBtn?.addEventListener('click', () => {
  playScene(sampleScene)
})

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  photoInput.disabled = true
  try {
    const scene = await requestExperience(file, {
      onStatus: (label) => {
        uploadStatus.textContent = label
      },
    })
    uploadStatus.textContent = ''
    await playScene(scene)
  } catch (err) {
    uploadStatus.textContent = err.message
  } finally {
    photoInput.disabled = false
  }
})
