// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'
import { requestReimagine } from './remix.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')
const artifactStrip = document.getElementById('artifact-strip')
const experienceStatus = document.getElementById('experience-status')

const book = document.getElementById('book')
const bookTitle = document.getElementById('book-title')
const bookPages = document.getElementById('book-pages')
const imaginePanel = document.getElementById('imagine-panel')
const selectedPassage = document.getElementById('selected-passage')
const eraChips = document.querySelectorAll('.era-chip')
const eraInput = document.getElementById('era-input')
const imagineBtn = document.getElementById('imagine-btn')
const imagineStatus = document.getElementById('imagine-status')
const remixGallery = document.getElementById('remix-gallery')

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
  stage.classList.remove('hidden')
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

// Render the scene as an e-book page with clickable passages.
function renderBook(scene) {
  bookTitle.textContent = scene.title
  bookPages.innerHTML = ''
  scene.beats.forEach((beat, index) => {
    const span = document.createElement('span')
    span.className = 'passage'
    span.dataset.index = String(index)
    span.textContent = beat.text + ' '
    span.addEventListener('click', () => selectPassage(span, beat))
    bookPages.appendChild(span)
  })
  book.classList.remove('hidden')
}

let selectedBeat = null

function selectPassage(span, beat) {
  bookPages.querySelectorAll('.passage.selected').forEach((el) => el.classList.remove('selected'))
  span.classList.add('selected')
  selectedBeat = beat
  selectedPassage.textContent = beat.text
  imaginePanel.classList.remove('hidden')
}

eraChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    eraInput.value = chip.textContent
  })
})

imagineBtn?.addEventListener('click', () => {
  const wish = eraInput.value.trim()
  if (!selectedBeat || !wish) return
  imagineBtn.disabled = true
  imagineStatus.textContent = 'Imagining...'
  if (!bgm) startBgm(0.2)

  const beat = selectedBeat
  let card = null
  let frame = null

  requestReimagine(
    { text: beat.text, sceneTitle: currentScene?.title ?? '', wish },
    {
      onImage: (label, src) => {
        card = document.createElement('div')
        card.className = 'remix-card'
        frame = document.createElement('div')
        frame.className = 'frame'
        const img = document.createElement('img')
        img.src = src
        img.alt = label
        frame.appendChild(img)
        const labelEl = document.createElement('p')
        labelEl.className = 'remix-label'
        const firstWords = beat.text.split(' ').slice(0, 6).join(' ')
        labelEl.textContent = `${label} · ${firstWords} · coming alive...`
        card.appendChild(frame)
        card.appendChild(labelEl)
        remixGallery.appendChild(card)
        // The picture emerges slowly from a dot in the dark — the reveal itself
        // is the "still animating" signal, paced to land with the moving loop.
        requestAnimationFrame(() =>
          requestAnimationFrame(() => frame.classList.add('revealing')),
        )
        // The child can fire the next imagining while this one comes alive.
        imagineStatus.textContent = ''
        imagineBtn.disabled = false
      },
      onClip: (url) => {
        if (!card || !frame) return
        const video = document.createElement('video')
        video.src = url
        video.muted = true // the bgm is the soundtrack
        video.loop = true
        video.autoplay = true
        video.playsInline = true
        frame.appendChild(video) // over the still; crossfades in
        frame.classList.add('revealed') // finish the circle quickly
        video.play?.()?.catch(() => {})
        requestAnimationFrame(() =>
          requestAnimationFrame(() => video.classList.add('live')),
        )
        const labelEl = card.querySelector('.remix-label')
        if (labelEl) {
          labelEl.textContent = labelEl.textContent.replace(' · coming alive...', '')
        }
      },
    },
  )
    .then((summary) => {
      // Stream ended without a clip — show the finished still plainly.
      if (!summary.clipUrl && frame) {
        frame.classList.add('revealed')
        const labelEl = card?.querySelector('.remix-label')
        if (labelEl) {
          labelEl.textContent = labelEl.textContent.replace(' · coming alive...', '')
        }
      }
    })
    .catch((err) => {
      imagineStatus.textContent = err.message
      imagineBtn.disabled = false
      if (frame) frame.classList.add('revealed') // never leave a black card
    })
})

let currentScene = null

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  currentEngine?.stop()
  stopBgm()
  photoInput.disabled = true
  artifactStrip.innerHTML = ''

  try {
    const summary = await requestExperience(file, {
      onStatus: (label) => {
        setStatus(label)
      },
      onScene: (s) => {
        currentScene = s
        setStatus('')
        renderBook(s)
        showExperienceScreen()
      },
    })
    currentScene = summary.scene
  } catch (err) {
    setStatus(err.message)
  } finally {
    photoInput.disabled = false
  }
})
