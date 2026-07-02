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
const artifactStrip = document.getElementById('artifact-strip')
const replayBtn = document.getElementById('replay-clip')

let bgm = null
let currentEngine = null

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

// Play a scene with per-beat media: images/clips become backgrounds, speech syncs beats.
async function playScene(
  rawScene,
  { images = {}, speech = {}, clips = {}, useClips = false, withBgm = false } = {},
) {
  currentEngine?.stop()
  const scene = validateScene(rawScene)
  showExperienceScreen()
  if (withBgm) startBgm()

  const beats = scene.beats.map((beat, i) => {
    const media = []
    if (useClips && clips[i]) {
      media.push({ type: 'clip', src: clips[i] }, { type: 'image', src: '' })
    } else if (images[i]) {
      media.push({ type: 'image', src: images[i] }, { type: 'clip', src: '' })
    }
    const audioUrls = speech[i]
    return { ...beat, effects: [...media, ...beat.effects], ...(audioUrls ? { audioUrls } : {}) }
  })

  const engine = createTimelineEngine({ stage })
  currentEngine = engine
  try {
    await engine.play({ ...scene, beats })
  } finally {
    stopBgm()
  }
}

startBtn?.addEventListener('click', () => {
  playScene(sampleScene).catch((err) => console.error(err))
})

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  currentEngine?.stop()
  stopBgm()
  photoInput.disabled = true
  replayBtn.classList.add('hidden')
  artifactStrip.innerHTML = ''

  let scene = null
  const images = {}
  const speech = {}
  const clips = {}
  let playbackStarted = false

  const startPlayback = () => {
    if (playbackStarted || !scene) return
    playbackStarted = true
    uploadStatus.textContent = ''
    playScene(scene, { images, speech, withBgm: true }).catch((err) => {
      uploadStatus.textContent = err.message
    })
  }

  const showReplay = () => {
    replayBtn.classList.remove('hidden')
    replayBtn.onclick = () => {
      replayBtn.classList.add('hidden')
      playScene(scene, { images, speech, clips, useClips: true, withBgm: true }).catch(
        (err) => console.error(err),
      )
    }
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
      onSpeech: (index, urls) => {
        speech[index] = urls
      },
      onClip: (index, url) => {
        clips[index] = url
        showReplay() // first clip onward — replay uses whichever clips have arrived
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
