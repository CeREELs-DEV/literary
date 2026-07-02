// src/main.js
import { requestExperience } from './upload.js'
import { requestReimagine } from './remix.js'
import { loadSampleBook, manifestToScene, originalsByIndex } from './samples.js'
import { createPassageViewer } from './viewer.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
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

const viewer = createPassageViewer({
  root: document.getElementById('passage-viewer'),
  tabs: document.getElementById('version-tabs'),
  card: document.getElementById('viewer-card'),
})

// The start screen hides once playback begins — mirror status to both screens.
function setStatus(label) {
  uploadStatus.textContent = label
  experienceStatus.textContent = label
}

let bgm = null

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

// Open the pre-generated sample book: the e-book text plus its canonical
// "original" cards (stills, moving loops, dialogue voices), all served from
// public/samples/ so the demo start needs no live generation.
startBtn?.addEventListener('click', async () => {
  setStatus('Opening the sample book...')
  const manifest = await loadSampleBook()
  if (!manifest) {
    setStatus('Samples are not built yet — run `npm run make-samples` first.')
    return
  }
  currentScene = manifestToScene(manifest)
  renderBook(currentScene)
  showExperienceScreen()
  // Seed each passage's Original tab — the viewer opens on passage click.
  for (const [index, original] of originalsByIndex(manifest)) {
    viewer.setOriginal(index, original)
  }
  setStatus('Tap a highlighted sentence to see its scene.')
  if (!bgm) startBgm(0.2)
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
    span.addEventListener('click', () => selectPassage(span, beat, index))
    bookPages.appendChild(span)
  })
  book.classList.remove('hidden')
}

let selectedBeat = null
let selectedIndex = null

function selectPassage(span, beat, index) {
  bookPages.querySelectorAll('.passage.selected').forEach((el) => el.classList.remove('selected'))
  span.classList.add('selected')
  selectedBeat = beat
  selectedIndex = index
  selectedPassage.textContent = beat.text
  viewer.show(index) // this passage's scene: Original tab (loop + voices) first
  imaginePanel.classList.remove('hidden')
}

eraChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    eraInput.value = chip.textContent
  })
})

imagineBtn?.addEventListener('click', () => {
  const wish = eraInput.value.trim()
  if (!selectedBeat || !wish || selectedIndex == null) return
  imagineBtn.disabled = true
  imagineStatus.textContent = 'Imagining...'
  if (!bgm) startBgm(0.2)

  const beat = selectedBeat
  const index = selectedIndex
  let tabId = null

  requestReimagine(
    {
      text: beat.text,
      sceneTitle: currentScene?.title ?? '',
      wish,
      // The whole page, so the remix knows the story around the selection.
      bookText: currentScene?.beats?.map((b) => b.text).join(' ') ?? '',
    },
    {
      onImage: (label, src) => {
        // The transform appears as a new tab on this passage and is selected.
        tabId = viewer.addTransform(index, { label, still: src, clip: null })
        // The child can fire the next imagining while this one comes alive.
        imagineStatus.textContent = ''
        imagineBtn.disabled = false
      },
      onClip: (url) => {
        if (tabId != null) viewer.updateTransform(index, tabId, { clip: url })
      },
    },
  ).catch((err) => {
    imagineStatus.textContent = err.message
    imagineBtn.disabled = false
  })
})

let currentScene = null

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
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
