// src/main.js — Literary Image Lab
//
// Two modes, one rule: reading comes first.
// Reading Mode  — the passage, full width, no literary terms. Marked phrases
//                 carry only a one-line question (micro hint) on tap.
// Lab Mode      — a bottom sheet opened AFTER reading (notice chips, the
//                 floating Imagine button, or a hint's "Imagine this").
//                 Steps reveal one at a time: Choose -> Imagine -> Create ->
//                 Reflect. "Maybe later" always returns to the text.
import { PASSAGE } from './lab-data.js'
import {
  MISSIONS, DEVICES, LENSES, HYPOTHESES,
  findMission, findDevice, findLens,
  defaultSelection, buildPrompt,
} from './lab.js'

const hintsToggle = document.getElementById('hints-toggle')
const passageBook = document.getElementById('passage-book')
const passageText = document.getElementById('passage-text')
const noticeChips = document.getElementById('notice-chips')
const hintPop = document.getElementById('hint-pop')
const imagineFab = document.getElementById('imagine-fab')

const labOverlay = document.getElementById('lab-overlay')
const sheetTitle = document.getElementById('sheet-title')
const laterBtn = document.getElementById('later-btn')
const stepChoose = document.getElementById('step-choose')
const chooseCards = document.getElementById('choose-cards')
const stepImagine = document.getElementById('step-imagine')
const imagineAnchor = document.getElementById('imagine-anchor')
const imagineQuestion = document.getElementById('imagine-question')
const imagineBox = document.getElementById('imagine-box')
const toCreateBtn = document.getElementById('to-create-btn')
const stepCreate = document.getElementById('step-create')
const deviceChips = document.getElementById('device-chips')
const deviceHint = document.getElementById('device-hint')
const lensChips = document.getElementById('lens-chips')
const hypothesisTabs = document.getElementById('hypothesis-tabs')
const promptBox = document.getElementById('prompt-box')
const copyBtn = document.getElementById('copy-btn')
const illustrateBtn = document.getElementById('illustrate-btn')
const toReflectBtn = document.getElementById('to-reflect-btn')
const illustrateStatus = document.getElementById('illustrate-status')
const illustration = document.getElementById('illustration')
const stepReflect = document.getElementById('step-reflect')
const defendBox = document.getElementById('defend-box')
const doneBtn = document.getElementById('done-btn')

let hintsOn = true
let selection = null // { mission, device, lens, hypothesis }
const imagineNotes = new Map() // mission id -> first thought
const defendNotes = new Map() // mission id -> defense
let thumbs = {} // mission id -> hypothesis id -> pre-generated image url

// --- Reading Mode ------------------------------------------------------------

function renderPassage() {
  passageBook.textContent = `${PASSAGE.title} — ${PASSAGE.sceneTitle}`
  passageText.innerHTML = ''
  for (const segment of PASSAGE.segments) {
    if (segment.mission) {
      const span = document.createElement('span')
      span.className = 'anchor'
      span.textContent = segment.text
      span.addEventListener('click', (event) => {
        if (hintsOn) showHint(segment.mission, event.currentTarget)
      })
      passageText.appendChild(span)
    } else {
      passageText.appendChild(document.createTextNode(segment.text))
    }
  }
}

function renderNotice() {
  noticeChips.innerHTML = ''
  for (const mission of MISSIONS.filter((m) => m.recommended)) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'notice-chip'
    btn.style.setProperty('--accent', mission.color)
    btn.innerHTML =
      `<em>“${mission.phrase}”</em><span>${mission.hint}</span>`
    btn.addEventListener('click', () => openLab(mission.id))
    noticeChips.appendChild(btn)
  }
}

// One line, one question — never a panel, never a term, never an answer.
function showHint(missionId, anchorEl) {
  const mission = findMission(missionId)
  if (!mission) return
  hintPop.innerHTML = ''
  const q = document.createElement('span')
  q.textContent = mission.hint
  const go = document.createElement('button')
  go.type = 'button'
  go.textContent = 'Imagine this →'
  go.addEventListener('click', () => {
    hideHint()
    openLab(missionId)
  })
  hintPop.append(q, go)
  const rect = anchorEl.getBoundingClientRect()
  hintPop.classList.remove('hidden')
  hintPop.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - hintPop.offsetWidth - 12))}px`
  hintPop.style.top = `${rect.bottom + window.scrollY + 8}px`
}

function hideHint() {
  hintPop.classList.add('hidden')
}

document.addEventListener('click', (event) => {
  if (!hintPop.contains(event.target) && !event.target.classList?.contains('anchor')) {
    hideHint()
  }
})

hintsToggle?.addEventListener('click', () => {
  hintsOn = !hintsOn
  hintsToggle.textContent = `Hints: ${hintsOn ? 'on' : 'off'}`
  hintsToggle.setAttribute('aria-pressed', String(hintsOn))
  document.body.classList.toggle('hints-off', !hintsOn)
  hideHint()
})

// --- Lab Mode (bottom sheet) --------------------------------------------------

function openLab(missionId = null) {
  hideHint()
  labOverlay.classList.remove('hidden')
  document.body.classList.add('sheet-open')
  if (missionId) {
    if (selection?.mission !== missionId) selection = defaultSelection(missionId)
    showStep('imagine')
  } else {
    showStep('choose')
  }
}

function closeLab() {
  labOverlay.classList.add('hidden')
  document.body.classList.remove('sheet-open')
}

// Steps reveal one at a time — never the whole lab at once.
function showStep(step) {
  stepChoose.classList.toggle('hidden', step !== 'choose')
  stepImagine.classList.toggle('hidden', step !== 'imagine')
  stepCreate.classList.toggle('hidden', step !== 'create')
  stepReflect.classList.toggle('hidden', step !== 'reflect')
  const mission = findMission(selection?.mission)
  if (step === 'choose') {
    sheetTitle.textContent = 'Imagine one phrase'
    renderChooseCards()
  }
  if (step === 'imagine' && mission) {
    sheetTitle.textContent = mission.title
    imagineAnchor.textContent = `“${mission.phrase}”`
    imagineQuestion.textContent = mission.question
    imagineBox.value = imagineNotes.get(mission.id) ?? ''
  }
  if (step === 'create' && mission) {
    sheetTitle.textContent = mission.title
    renderCreate()
  }
  if (step === 'reflect' && mission) {
    sheetTitle.textContent = mission.title
    defendBox.value = defendNotes.get(mission.id) ?? ''
  }
}

function renderChooseCards() {
  chooseCards.innerHTML = ''
  for (const mission of MISSIONS.filter((m) => m.recommended)) {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = 'mission-card'
    card.style.setProperty('--accent', mission.color)
    const thumb = thumbs[mission.id]?.literal
    card.innerHTML =
      (thumb ? `<img class="mission-thumb" src="${thumb}" alt="" />` : '') +
      `<strong>${mission.icon} ${mission.title}</strong>` +
      `<span class="mission-phrase">“${mission.phrase}”</span>` +
      `<span class="mission-question">${mission.hint}</span>`
    card.addEventListener('click', () => {
      if (selection?.mission !== mission.id) selection = defaultSelection(mission.id)
      showStep('imagine')
    })
    chooseCards.appendChild(card)
  }
  const note = document.createElement('p')
  note.className = 'hint'
  note.textContent = 'Or close this and tap any underlined phrase in the text.'
  chooseCards.appendChild(note)
}

function chip(label, active, suggested, onClick, icon = '') {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `chip${active ? ' active' : ''}${suggested ? ' suggested' : ''}`
  const text = suggested && !active ? `${label} ✦` : label
  btn.textContent = icon ? `${icon} ${text}` : text
  btn.addEventListener('click', onClick)
  return btn
}

function renderCreate() {
  const mission = findMission(selection.mission)

  lensChips.innerHTML = ''
  for (const lens of LENSES) {
    lensChips.appendChild(
      chip(lens.label, selection.lens === lens.id, mission.lenses.includes(lens.id), () => {
        selection.lens = lens.id
        renderCreate()
      }, lens.icon),
    )
  }

  deviceChips.innerHTML = ''
  for (const device of DEVICES) {
    deviceChips.appendChild(
      chip(device.label, selection.device === device.id, mission.device === device.id, () => {
        selection.device = device.id
        renderCreate()
      }, device.icon),
    )
  }
  deviceHint.textContent = findDevice(selection.device)?.hint ?? ''

  hypothesisTabs.innerHTML = ''
  for (const hypothesis of HYPOTHESES) {
    const thumb = thumbs[mission.id]?.[hypothesis.id]
    if (thumb) {
      const tile = document.createElement('button')
      tile.type = 'button'
      tile.className = `hypo-tile${selection.hypothesis === hypothesis.id ? ' active' : ''}`
      tile.innerHTML =
        `<img src="${thumb}" alt="${hypothesis.label}" />` +
        `<span><strong>${hypothesis.label}</strong> ${hypothesis.blurb}</span>`
      tile.addEventListener('click', () => {
        selection.hypothesis = hypothesis.id
        renderCreate()
      })
      hypothesisTabs.appendChild(tile)
    } else {
      hypothesisTabs.appendChild(
        chip(hypothesis.label, selection.hypothesis === hypothesis.id, false, () => {
          selection.hypothesis = hypothesis.id
          renderCreate()
        }),
      )
    }
  }

  promptBox.value = buildPrompt(selection)
  illustration.innerHTML = ''
  illustrateStatus.textContent = ''
}

// --- wiring -------------------------------------------------------------------

imagineFab?.addEventListener('click', () => openLab())
laterBtn?.addEventListener('click', closeLab)
labOverlay?.addEventListener('click', (event) => {
  if (event.target === labOverlay) closeLab()
})

imagineBox?.addEventListener('input', () => {
  if (selection) imagineNotes.set(selection.mission, imagineBox.value)
})
toCreateBtn?.addEventListener('click', () => showStep('create'))
toReflectBtn?.addEventListener('click', () => showStep('reflect'))

defendBox?.addEventListener('input', () => {
  if (selection) defendNotes.set(selection.mission, defendBox.value)
})
doneBtn?.addEventListener('click', closeLab)

copyBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptBox.value)
    illustrateStatus.textContent = 'Prompt copied.'
  } catch {
    promptBox.select()
    document.execCommand?.('copy')
  }
})

illustrateBtn?.addEventListener('click', async () => {
  if (!selection) return
  illustrateBtn.disabled = true
  illustrateStatus.textContent = 'Painting one possible interpretation...'
  try {
    const res = await fetch('/api/illustrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptBox.value }),
    })
    // A non-JSON reply means the request never reached the API server.
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.src) {
      throw new Error(
        body?.error ??
          'Could not reach the image server — start it with `npm run server` and try again.',
      )
    }
    illustration.innerHTML = ''
    const img = document.createElement('img')
    img.src = body.src
    img.alt = 'One possible interpretation'
    illustration.appendChild(img)
    illustrateStatus.textContent =
      'One possible interpretation — not the answer. Would you paint it differently?'
  } catch (err) {
    illustrateStatus.textContent = err.message
  } finally {
    illustrateBtn.disabled = false
  }
})

// Pre-generated mission/hypothesis illustrations (optional visual layer).
fetch('/lab/manifest.json')
  .then((res) => (res.ok ? res.json() : {}))
  .catch(() => ({}))
  .then((data) => {
    thumbs = data ?? {}
  })

renderPassage()
renderNotice()
