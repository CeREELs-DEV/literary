import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')

startBtn?.addEventListener('click', async () => {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')

  const scene = validateScene(sampleScene)
  const engine = createTimelineEngine({ stage })
  await engine.play(scene)
})
