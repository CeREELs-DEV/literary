// src/main.js — Literary Image Lab
//
// The lab walks a student through reading, not generating:
// Anchor (pick a phrase) -> Device (name the craft) -> Lens (choose a way to
// imagine) -> Hypothesis (literal / metaphorical / abstract) -> Prompt
// (their interpretation, written down) -> Defend (say why).
import { PASSAGE } from './lab-data.js'
import {
  MISSIONS, DEVICES, LENSES, HYPOTHESES,
  findMission, findDevice, findLens,
  defaultSelection, buildPrompt, reflectionFor,
} from './lab.js'

const missionStrip = document.getElementById('mission-strip')
const passageBook = document.getElementById('passage-book')
const passageText = document.getElementById('passage-text')

const workbench = document.getElementById('workbench')
const workbenchEmpty = document.getElementById('workbench-empty')
const anchorPhrase = document.getElementById('anchor-phrase')
const deviceChips = document.getElementById('device-chips')
const deviceHint = document.getElementById('device-hint')
const lensChips = document.getElementById('lens-chips')
const lensQuestion = document.getElementById('lens-question')
const hypothesisTabs = document.getElementById('hypothesis-tabs')
const hypothesisBlurb = document.getElementById('hypothesis-blurb')

const output = document.getElementById('output')
const outputEmpty = document.getElementById('output-empty')
const promptBox = document.getElementById('prompt-box')
const copyBtn = document.getElementById('copy-btn')
const illustrateBtn = document.getElementById('illustrate-btn')
const illustrateStatus = document.getElementById('illustrate-status')
const illustration = document.getElementById('illustration')
const reflectionQuestion = document.getElementById('reflection-question')
const defendBox = document.getElementById('defend-box')

let selection = null // { mission, device, lens, hypothesis }
const defendNotes = new Map() // mission id -> student's defense text

// --- rendering -------------------------------------------------------------

function renderMissionStrip() {
  missionStrip.innerHTML = ''
  for (const mission of MISSIONS) {
    const card = document.createElement('button')
    card.type = 'button'
    card.className = `mission-card${selection?.mission === mission.id ? ' active' : ''}`
    card.innerHTML =
      `<strong>${mission.title}</strong>` +
      `<span class="mission-phrase">${mission.phrase}</span>` +
      `<span class="mission-question">${mission.question}</span>`
    card.addEventListener('click', () => selectMission(mission.id))
    missionStrip.appendChild(card)
  }
}

function renderPassage() {
  passageBook.textContent = `${PASSAGE.title} — ${PASSAGE.sceneTitle}`
  passageText.innerHTML = ''
  for (const segment of PASSAGE.segments) {
    if (segment.mission) {
      const span = document.createElement('span')
      span.className =
        `anchor${selection?.mission === segment.mission ? ' selected' : ''}`
      span.textContent = segment.text
      span.addEventListener('click', () => selectMission(segment.mission))
      passageText.appendChild(span)
    } else {
      passageText.appendChild(document.createTextNode(segment.text))
    }
  }
}

function chip(label, active, suggested, onClick) {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = `chip${active ? ' active' : ''}${suggested ? ' suggested' : ''}`
  btn.textContent = suggested && !active ? `${label} ✦` : label
  btn.addEventListener('click', onClick)
  return btn
}

function renderWorkbench() {
  const mission = findMission(selection?.mission)
  workbenchEmpty.classList.toggle('hidden', !!mission)
  workbench.classList.toggle('hidden', !mission)
  output.classList.toggle('hidden', !mission)
  outputEmpty.classList.toggle('hidden', !!mission)
  if (!mission) return

  anchorPhrase.textContent = `“${mission.phrase}”`

  deviceChips.innerHTML = ''
  for (const device of DEVICES) {
    deviceChips.appendChild(
      chip(device.label, selection.device === device.id, mission.device === device.id, () => {
        selection.device = device.id
        update()
      }),
    )
  }
  deviceHint.textContent = findDevice(selection.device)?.hint ?? ''

  lensChips.innerHTML = ''
  for (const lens of LENSES) {
    lensChips.appendChild(
      chip(lens.label, selection.lens === lens.id, mission.lenses.includes(lens.id), () => {
        selection.lens = lens.id
        update()
      }),
    )
  }
  lensQuestion.textContent = findLens(selection.lens)?.question ?? ''

  hypothesisTabs.innerHTML = ''
  for (const hypothesis of HYPOTHESES) {
    hypothesisTabs.appendChild(
      chip(hypothesis.label, selection.hypothesis === hypothesis.id, false, () => {
        selection.hypothesis = hypothesis.id
        update()
      }),
    )
  }
  hypothesisBlurb.textContent =
    HYPOTHESES.find((h) => h.id === selection.hypothesis)?.blurb ?? ''
}

function renderOutput() {
  if (!selection) return
  promptBox.value = buildPrompt(selection)
  const reflection = reflectionFor(selection.mission)
  reflectionQuestion.textContent = reflection?.question ?? ''
  defendBox.value = defendNotes.get(selection.mission) ?? ''
  illustration.innerHTML = ''
  illustrateStatus.textContent = ''
}

function update() {
  renderMissionStrip()
  renderPassage()
  renderWorkbench()
  renderOutput()
}

function selectMission(missionId) {
  if (selection?.mission !== missionId) selection = defaultSelection(missionId)
  update()
}

// --- actions ---------------------------------------------------------------

copyBtn?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(promptBox.value)
    illustrateStatus.textContent = 'Prompt copied.'
  } catch {
    promptBox.select()
    document.execCommand?.('copy')
  }
})

defendBox?.addEventListener('input', () => {
  if (selection) defendNotes.set(selection.mission, defendBox.value)
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
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error ?? `Illustration failed (${res.status})`)
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

update()
