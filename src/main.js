// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'
import { createCinema } from './cinema.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')
const artifactStrip = document.getElementById('artifact-strip')
const experienceStatus = document.getElementById('experience-status')
const watchFilmBtn = document.getElementById('watch-film')

// The start screen hides once playback begins — mirror status to both screens.
function setStatus(label) {
  uploadStatus.textContent = label
  experienceStatus.textContent = label
}

let bgm = null
let currentEngine = null

function startBgm(volume = 0.25) {
  stopBgm()
  bgm = new Audio(encodeURI('/audio/gomtang s3.mp3'))
  bgm.loop = true
  bgm.volume = volume
  bgm.play?.().catch(() => {}) // silently skip if the asset is absent
}

function stopBgm() {
  bgm?.pause()
  bgm = null
}

const cinema = createCinema(
  {
    root: document.getElementById('cinema'),
    video: document.getElementById('film-video'),
    image: document.getElementById('film-image'),
    subtitle: document.getElementById('film-subtitle'),
    label: document.getElementById('imagining-label'),
    questionCard: document.getElementById('question-card'),
    closeBtn: document.getElementById('cinema-close'),
    replayBtn: document.getElementById('cinema-replay'),
  },
  { onClose: () => stopBgm() },
)

function showExperienceScreen() {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
}

// Play a scene with per-beat media: images become backgrounds, speech syncs beats.
async function playScene(
  rawScene,
  { images = {}, speech = {}, withBgm = false } = {},
) {
  currentEngine?.stop()
  const scene = validateScene(rawScene)
  showExperienceScreen()
  if (withBgm) startBgm()

  const beats = scene.beats.map((beat, i) => {
    const media = images[i] ? [{ type: 'image', src: images[i] }] : []
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
  watchFilmBtn.classList.add('hidden')
  artifactStrip.innerHTML = ''

  let scene = null
  const images = {}
  const speech = {}
  const imaginingImages = {}
  const imaginingFilms = {}
  let playbackStarted = false

  const startPlayback = () => {
    if (playbackStarted || !scene) return
    playbackStarted = true
    // keep the current status visible — film progress continues underneath
    playScene(scene, { images, speech, withBgm: true }).catch((err) => {
      setStatus(err.message)
    })
  }

  // The cinema plays every imagining that has at least an illustration;
  // films slot in for the ones that finished.
  const openCinema = () => {
    currentEngine?.stop() // stop the reading-mode playback and its voices
    startBgm(0.12) // music under the films' native audio
    const keyText = scene?.beats?.[scene.keyBeatIndex]?.text ?? ''
    const playlist = (scene?.imaginings ?? [])
      .map((imagining, k) => ({
        title: imagining.title,
        filmUrl: imaginingFilms[k] ?? null,
        imageSrc: imaginingImages[k] ?? null,
        text: keyText,
      }))
      .filter((item) => item.filmUrl || item.imageSrc)
    cinema.open({ playlist })
  }

  const maybeShowWatch = () => {
    const hasAnything =
      Object.keys(imaginingFilms).length > 0 || Object.keys(imaginingImages).length > 0
    if (!hasAnything) return
    watchFilmBtn.classList.remove('hidden')
    watchFilmBtn.onclick = openCinema
  }

  try {
    const summary = await requestExperience(file, {
      onStatus: (label, stageName) => {
        setStatus(label)
        // Images and voices are done once filming starts — begin the experience now.
        if (stageName === 'animating') startPlayback()
        if (stageName === 'done') {
          startPlayback() // covers the no-visuals path
          maybeShowWatch() // even film-less imaginings are worth watching
        }
      },
      onScene: (s) => {
        scene = s
        setStatus(`"${s.title}" — designing the experience...`)
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
      onImaginingImage: (index, src) => {
        imaginingImages[index] = src
      },
      onImaginingFilm: (index, url) => {
        imaginingFilms[index] = url
        maybeShowWatch()
      },
    })
    // Stream finished — make sure playback happened even if no status fired.
    scene = summary.scene
    startPlayback()
    maybeShowWatch()
  } catch (err) {
    setStatus(err.message)
  } finally {
    photoInput.disabled = false
  }
})
