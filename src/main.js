// src/main.js — Curated Imagination Player
//
// Students read, then watch: the paragraph first, undisturbed; at its end,
// one button opens the player. Inside: three scenes from the paragraph,
// each pre-produced from three viewpoints (Felicity / Jonah / the World) —
// a 3 x 3 grid of short films to watch and compare. No prompts, no models,
// no generation UI ever reaches this screen.
import { PASSAGE, SCENES, VIEWPOINTS, COMPARE_QUESTIONS } from './player-data.js'

const passageBook = document.getElementById('passage-book')
const passageText = document.getElementById('passage-text')
const openPlayerBtn = document.getElementById('open-player-btn')
const playerOverlay = document.getElementById('player-overlay')
const closePlayerBtn = document.getElementById('close-player-btn')
const viewpointTabs = document.getElementById('viewpoint-tabs')
const sceneMedia = document.getElementById('scene-media')
const sceneInterpretation = document.getElementById('scene-interpretation')
const sceneAnchors = document.getElementById('scene-anchors')
const sceneQuestions = document.getElementById('scene-questions')
const compareQuestions = document.getElementById('compare-questions')

let activeSceneId = SCENES[0]?.id ?? null
let activeViewpoint = VIEWPOINTS[0]?.id ?? null

// --- Reading -----------------------------------------------------------------

function renderPassage() {
  passageBook.textContent =
    `${PASSAGE.title} — ${PASSAGE.sceneTitle} (${PASSAGE.source})`
  passageText.textContent = PASSAGE.text
}

// --- Player ------------------------------------------------------------------

function openPlayer() {
  playerOverlay.classList.remove('hidden')
  document.body.classList.add('sheet-open')
  renderPlayer()
}

function closePlayer() {
  playerOverlay.classList.add('hidden')
  document.body.classList.remove('sheet-open')
  sceneMedia.innerHTML = '' // stop any playing video
}

function renderPlayer() {
  viewpointTabs.innerHTML = ''

  // Row 1: which moment of the paragraph.
  const sceneLabel = document.createElement('span')
  sceneLabel.className = 'tab-group-label'
  sceneLabel.textContent = 'Scene'
  viewpointTabs.appendChild(sceneLabel)
  const sceneRow = document.createElement('div')
  sceneRow.className = 'tab-row'
  for (const scene of SCENES) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.className = `viewpoint-tab${scene.id === activeSceneId ? ' active' : ''}`
    tab.innerHTML = `<span class="vp-icon">${scene.icon}</span>${scene.title}`
    tab.addEventListener('click', () => {
      activeSceneId = scene.id
      renderPlayer()
    })
    sceneRow.appendChild(tab)
  }
  viewpointTabs.appendChild(sceneRow)

  // Row 2: whose eyes.
  const viewLabel = document.createElement('span')
  viewLabel.className = 'tab-group-label'
  viewLabel.textContent = 'Through whose eyes?'
  viewpointTabs.appendChild(viewLabel)
  const viewRow = document.createElement('div')
  viewRow.className = 'tab-row'
  for (const viewpoint of VIEWPOINTS) {
    const tab = document.createElement('button')
    tab.type = 'button'
    tab.className = `viewpoint-tab${viewpoint.id === activeViewpoint ? ' active' : ''}`
    tab.style.setProperty('--accent', viewpoint.color)
    tab.innerHTML = `<span class="vp-icon">${viewpoint.icon}</span>${viewpoint.title}`
    tab.addEventListener('click', () => {
      activeViewpoint = viewpoint.id
      renderPlayer()
    })
    viewRow.appendChild(tab)
  }
  viewpointTabs.appendChild(viewRow)

  const scene = SCENES.find((s) => s.id === activeSceneId)
  const viewpoint = VIEWPOINTS.find((v) => v.id === activeViewpoint)
  const view = scene?.views?.[activeViewpoint]
  if (!scene || !viewpoint || !view) return

  // Video if the asset is published; a quiet placeholder card otherwise.
  sceneMedia.innerHTML = ''
  const video = document.createElement('video')
  video.src = view.videoAssetUrl
  if (view.thumbnailUrl) video.poster = view.thumbnailUrl
  video.muted = true
  video.loop = true
  video.autoplay = true
  video.playsInline = true
  video.controls = true
  video.addEventListener('error', () => {
    sceneMedia.innerHTML = ''
    const placeholder = document.createElement('div')
    placeholder.className = 'video-placeholder'
    placeholder.style.setProperty('--accent', viewpoint.color)
    placeholder.innerHTML =
      `<span class="vp-icon">${scene.icon}${viewpoint.icon}</span>` +
      `<span>This scene is still being painted — coming soon.</span>`
    sceneMedia.appendChild(placeholder)
  })
  sceneMedia.appendChild(video)
  video.play?.()?.catch(() => {})

  sceneInterpretation.textContent = `“${view.interpretation}”`
  sceneInterpretation.style.setProperty('--accent', viewpoint.color)

  sceneAnchors.innerHTML = ''
  for (const phrase of scene.anchorPhrases) {
    const chip = document.createElement('span')
    chip.className = 'anchor-chip'
    chip.textContent = phrase
    sceneAnchors.appendChild(chip)
  }

  sceneQuestions.innerHTML = ''
  const heading = document.createElement('h4')
  heading.textContent = 'While you watch'
  sceneQuestions.appendChild(heading)
  const list = document.createElement('ol')
  for (const question of scene.questions) {
    const item = document.createElement('li')
    item.textContent = question
    list.appendChild(item)
  }
  sceneQuestions.appendChild(list)
}

function renderCompare() {
  compareQuestions.innerHTML = ''
  for (const question of COMPARE_QUESTIONS) {
    const item = document.createElement('li')
    item.textContent = question
    compareQuestions.appendChild(item)
  }
}

// --- wiring --------------------------------------------------------------------

openPlayerBtn?.addEventListener('click', openPlayer)
closePlayerBtn?.addEventListener('click', closePlayer)
playerOverlay?.addEventListener('click', (event) => {
  if (event.target === playerOverlay) closePlayer()
})

renderPassage()
renderCompare()
