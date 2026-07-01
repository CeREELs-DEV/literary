// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { applyEffect } from './effects/registry.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')
const artifactStrip = document.getElementById('artifact-strip')
const replayBtn = document.getElementById('replay-clip')

let bgm = null

function startBgm() {
  stopBgm()
  bgm = new Audio(encodeURI('/audio/gomtang s3.mp3'))
  bgm.loop = true
  bgm.volume = 0.25
  bgm.play?.().catch(() => {}) // silently skip if the asset is absent
}

function stopBgm() {
  bgm?.pause()
  bgm = null
}

function showExperienceScreen() {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
}

// Play a scene; images (index -> src) become per-beat backgrounds unless a clip is playing.
async function playScene(rawScene, { images = {}, clipUrl = null, withBgm = false } = {}) {
  const scene = validateScene(rawScene)
  showExperienceScreen()
  if (withBgm) startBgm()

  applyEffect(stage, { type: 'image', src: '' }) // clear previous background
  if (clipUrl) applyEffect(stage, { type: 'clip', src: clipUrl })
  else applyEffect(stage, { type: 'clip', src: '' })

  const beats = scene.beats.map((beat, i) =>
    !clipUrl && images[i]
      ? { ...beat, effects: [{ type: 'image', src: images[i] }, ...beat.effects] }
      : beat,
  )

  const engine = createTimelineEngine({ stage })
  try {
    await engine.play({ ...scene, beats })
  } finally {
    stopBgm() // don't keep looping after the experience ends
  }
}

startBtn?.addEventListener('click', () => {
  playScene(sampleScene).catch((err) => console.error(err))
})

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  photoInput.disabled = true
  replayBtn.classList.add('hidden')
  artifactStrip.innerHTML = ''

  let scene = null
  const images = {}
  let playbackStarted = false

  const startPlayback = () => {
    if (playbackStarted || !scene) return
    playbackStarted = true
    uploadStatus.textContent = ''
    playScene(scene, { images, withBgm: true }).catch((err) => {
      uploadStatus.textContent = err.message
    })
  }

  try {
    const summary = await requestExperience(file, {
      onStatus: (label, stageName) => {
        uploadStatus.textContent = label
        // Images are done once animation starts — begin the experience now.
        if (stageName === 'animating') startPlayback()
        if (stageName === 'done') startPlayback() // covers the no-visuals path
      },
      onScene: (s) => {
        scene = s
        uploadStatus.textContent = `"${s.title}" — designing the experience...`
      },
      onImage: (index, src) => {
        images[index] = src
        const img = document.createElement('img')
        img.src = src
        img.alt = `Scene ${index + 1}`
        artifactStrip.appendChild(img)
      },
      onClip: (url) => {
        replayBtn.classList.remove('hidden')
        replayBtn.onclick = () => {
          replayBtn.classList.add('hidden')
          playScene(scene, { clipUrl: url, withBgm: true }).catch((err) =>
            console.error(err),
          )
        }
      },
    })
    // Stream finished — make sure playback happened even if no status fired.
    scene = summary.scene
    startPlayback()
  } catch (err) {
    uploadStatus.textContent = err.message
  } finally {
    photoInput.disabled = false
  }
})
