// src/main.js — Matter of Perspective
//
// One structure, three sample books: the reader on the left is split into
// clickable beat blocks; the scene column plays the beat from the chosen
// point of view. Snicker cells play real pre-produced films; the other
// cells can play real curated films or fall back to ink storyboard mockups.
import { BOOKS } from './books-data.js'

const $ = (id) => document.getElementById(id)

const ICON = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></svg>',
  frame: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9h19"/><circle cx="6" cy="7" r="0.6" fill="currentColor"/><circle cx="9" cy="7" r="0.6" fill="currentColor"/></svg>',
}

let bookKey = Object.keys(BOOKS)[0]
let povIdx = 0
let beatIdx = 0
let qIdx = 0
let hunting = false
let questionDone = false
let qEditing = -1
const answers = {}

const B = () => BOOKS[bookKey]
const cellKey = () => `${B().povs[povIdx].key}|${B().beats[beatIdx].key}`

/* ---- reader ---- */

function renderReader() {
  const b = B()
  $('reader').innerHTML =
    `<div class="chap">${b.author} &middot; ${b.chap}</div>` +
    `<div class="passagename">&ldquo;${b.passage}&rdquo;` +
    `<button class="povinfo" id="povinfo" aria-label="About this story's point of view">i</button>` +
    `<div class="povpop" id="povpop"><div class="pph">Point of view</div>${b.povInfo}</div></div>` +
    `<div class="byline"></div><div class="recap">${b.setup}</div><div class="excerpt">${b.excerpt}</div>`
  // Tap a beat in the text -> the scene jumps there and plays.
  $('reader').querySelectorAll('.beatblock').forEach((el) =>
    el.addEventListener('click', () => {
      beatIdx = +el.dataset.beat
      render(false)
      controller?.play()
    }),
  )
  bindPovInfo()
  syncBeatBlocks()
}

function bindPovInfo() {
  const pi = $('povinfo')
  const pp = $('povpop')
  if (!pi || !pp) return
  let closeT = null
  const open = () => {
    clearTimeout(closeT)
    pp.classList.add('show')
  }
  const close = () => pp.classList.remove('show')
  const softClose = () => {
    closeT = setTimeout(close, 220)
  }
  pi.addEventListener('click', (event) => {
    event.stopPropagation()
    pp.classList.toggle('show')
  })
  pp.addEventListener('click', (event) => event.stopPropagation())
  pi.addEventListener('mouseenter', open)
  pi.addEventListener('mouseleave', softClose)
  pp.addEventListener('mouseenter', open)
  pp.addEventListener('mouseleave', softClose)
  document.addEventListener('click', close)
}

function syncBeatBlocks() {
  $('reader')
    .querySelectorAll('.beatblock')
    .forEach((el) => el.classList.toggle('on', +el.dataset.beat === beatIdx))
}

/* ---- beat + pov controls ---- */

function renderButtons() {
  const b = B()
  $('beatrow').innerHTML = b.beats
    .map(
      (bt, i) =>
        `<button class="beatbtn k${i + 1}${i === beatIdx ? ' on' : ''}" data-i="${i}">` +
        `<span class="bn">${bt.n}</span><span class="bl">${bt.label}</span></button>`,
    )
    .join('')
  $('beatrow').style.gridTemplateColumns = `repeat(${b.beats.length},1fr)`
  $('povrow').innerHTML =
    '<span class="seglbl">POV</span>' +
    b.povs
      .map(
        (p, i) =>
          `<button class="seg${i === povIdx ? ' on' : ''}" data-i="${i}">` +
          `${ICON[p.icon]}<span>${p.label}</span></button>`,
      )
      .join('')
  $('beatrow').querySelectorAll('.beatbtn').forEach((el) =>
    el.addEventListener('click', () => {
      beatIdx = +el.dataset.i
      render(false)
      controller?.play()
    }),
  )
  $('povrow').querySelectorAll('.seg').forEach((el) =>
    el.addEventListener('click', () => {
      const wasPlaying = controller?.isPlaying() ?? false
      povIdx = +el.dataset.i
      render(false)
      if (wasPlaying) controller?.play() // keep watching across the POV cut
    }),
  )
}

/* ---- player: real film or mock storyboard ---- */

const fmt = (s) => {
  s = Math.max(0, s || 0)
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss < 10 ? '0' : ''}${ss}`
}

function paint(t, dur) {
  const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0
  $('fill').style.width = `${pct}%`
  $('head').style.left = `${pct}%`
  $('tcode').textContent = `${fmt(t)} / ${fmt(dur)}`
}

function setPlayingUi(on) {
  $('player').classList.toggle('playing', on)
}

// Controls a real <video> cell through the shared transport bar.
function realController(video) {
  const dur = () => (Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 8)
  const onTime = () => paint(video.currentTime, dur())
  const onPlay = () => setPlayingUi(true)
  const onPause = () => setPlayingUi(false)
  const onEnded = () => {
    setPlayingUi(false)
    video.currentTime = 0
    paint(0, dur())
  }
  video.addEventListener('timeupdate', onTime)
  video.addEventListener('durationchange', onTime)
  video.addEventListener('play', onPlay)
  video.addEventListener('pause', onPause)
  video.addEventListener('ended', onEnded)
  paint(0, dur())
  return {
    isPlaying: () => !video.paused && !video.ended,
    play: () => video.play?.()?.catch?.(() => {}),
    toggle() {
      if (video.paused || video.ended) this.play()
      else video.pause()
    },
    seekTo(ratio) {
      video.currentTime = ratio * dur()
      paint(video.currentTime, dur())
    },
    dispose() {
      video.pause()
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('durationchange', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', onEnded)
    },
  }
}

// Fakes an 8s clip for storyboard-mockup cells (no asset yet).
function mockController(clip = 8) {
  let t = 0
  let playing = false
  let rafId = null
  let lastTs = 0
  const tick = (ts) => {
    if (!playing) return
    t += (ts - lastTs) / 1000
    lastTs = ts
    if (t >= clip) {
      t = 0
      playing = false
      setPlayingUi(false)
      paint(0, clip)
      return
    }
    paint(t, clip)
    rafId = requestAnimationFrame(tick)
  }
  const setPlaying = (on) => {
    playing = on
    setPlayingUi(on)
    if (on) {
      lastTs = performance.now()
      rafId = requestAnimationFrame(tick)
    } else if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
  paint(0, clip)
  return {
    isPlaying: () => playing,
    play: () => setPlaying(true),
    toggle() {
      setPlaying(!playing)
    },
    seekTo(ratio) {
      t = ratio * clip
      paint(t, clip)
    },
    dispose() {
      setPlaying(false)
    },
  }
}

let controller = null

function renderPlayer() {
  const cell = B().cells[cellKey()]
  const player = $('player')
  controller?.dispose()
  controller = null
  setPlayingUi(false)
  player.querySelectorAll('svg, video').forEach((el) => el.remove())

  if (cell?.video) {
    const video = document.createElement('video')
    video.src = cell.video
    if (cell.poster) video.poster = cell.poster
    video.playsInline = true
    video.preload = 'metadata'
    // A cell whose film is not published yet falls back to its storyboard.
    video.addEventListener('error', () => {
      if (!cell.svg) return
      controller?.dispose()
      video.remove()
      const holder = document.createElement('div')
      holder.innerHTML = cell.svg()
      player.insertBefore(holder.firstChild, player.firstChild)
      $('ribbon').textContent = 'Video mockup'
      controller = mockController()
    })
    player.insertBefore(video, player.firstChild)
    $('ribbon').textContent = B().book
    controller = realController(video)
  } else if (cell?.svg) {
    const holder = document.createElement('div')
    holder.innerHTML = cell.svg()
    player.insertBefore(holder.firstChild, player.firstChild)
    $('ribbon').textContent = 'Video mockup'
    controller = mockController()
  }
}

function renderMeta() {
  document.querySelectorAll('.booktab').forEach((t) =>
    t.classList.toggle('on', t.dataset.b === bookKey),
  )
}

function render(full) {
  if (full) renderReader()
  renderButtons()
  renderPlayer()
  renderMeta()
  renderQuestions()
  syncBeatBlocks()
}

/* ---- passage questions ---- */

const ansKey = (i) => `${bookKey}|${i}`

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function withIcons(s) {
  return s.replace(/\[eye\]/g, `<span class="qeye">${ICON.eye}</span>`)
}

function needCount() {
  const q = (B().questions || [])[qIdx]
  return q?.need || 1
}

function renderQuestions() {
  const qs = B().questions || []
  const section = $('qsection')
  if (!section) return
  if (!qs.length) {
    section.innerHTML = ''
    return
  }
  if (qIdx >= qs.length) qIdx = 0
  const q = qs[qIdx]
  const nav = qs
    .map((_, i) => `<button class="${i === qIdx ? 'on' : ''}" data-i="${i}">${i + 1}</button>`)
    .join('')
  const partChip = q.part ? `<span class="qpart">${q.part}</span>` : ''

  let body
  if (q.type === 'find') {
    let actions
    let hint = ''
    if (!hunting) {
      actions = `<button class="qbtn primary" id="huntbtn">Tap the clue${needCount() > 1 ? 's' : ''}</button>`
    } else if (!questionDone) {
      actions =
        '<button class="qbtn ghost" id="revealbtn">Show all clues</button>' +
        '<button class="qbtn ghost" id="clearbtn">Clear</button>'
      hint = `<div class="qhint" id="qhint">${huntStatus(0)}</div>`
    } else {
      actions = '<button class="qbtn primary" id="huntbtn">Try again</button>'
    }
    body =
      `${partChip}<span class="qtype find">Find in the text</span>` +
      `<div class="qprompt">${withIcons(q.q)}</div>${hint}` +
      `<div class="qactions">${actions}</div><div class="qfeedback" id="qfb"></div>`
  } else {
    const saved = answers[ansKey(qIdx)]
    const editing = qEditing === qIdx || !saved
    let ansUI
    if (editing) {
      ansUI =
        `<textarea class="qanswer" id="qanswer" placeholder="Type your answer...">${saved ? esc(saved) : ''}</textarea>` +
        '<div class="qactions"><button class="qbtn primary" id="savebtn">Save answer</button><span class="qhint" id="savemsg"></span></div>'
    } else {
      ansUI =
        `<div class="qsaved">${esc(saved).replace(/\n/g, '<br>')}</div>` +
        '<div class="qactions"><button class="qbtn ghost" id="editbtn">Edit answer</button><span class="qhint">Saved ✓</span></div>'
    }
    body =
      `${partChip}<span class="qtype open">Think &amp; discuss</span>` +
      `<div class="qprompt">${withIcons(q.q)}</div>${ansUI}`
  }

  section.innerHTML =
    `<div class="qhead"><span class="qtitle">Questions</span><span class="qsub">${qIdx + 1} of ${qs.length}</span>` +
    `<span class="qnav">${nav}</span></div><div class="qcard">${body}</div>`

  section.querySelectorAll('.qnav button').forEach((btn) =>
    btn.addEventListener('click', () => {
      exitHunt()
      qEditing = -1
      qIdx = +btn.dataset.i
      renderQuestions()
    }),
  )

  if (q.type === 'find') {
    $('huntbtn')?.addEventListener('click', () => {
      if (!hunting) startHunt()
      else {
        clearHunt()
        startHunt()
      }
    })
    $('revealbtn')?.addEventListener('click', revealAll)
    $('clearbtn')?.addEventListener('click', clearHunt)
    if (questionDone) paintFeedback()
    return
  }

  const ta = $('qanswer')
  ta?.addEventListener('input', () => {
    answers[ansKey(qIdx)] = ta.value
    const msg = $('savemsg')
    if (msg) msg.textContent = ''
  })
  $('savebtn')?.addEventListener('click', () => {
    const value = $('qanswer').value.trim()
    answers[ansKey(qIdx)] = value
    qEditing = -1
    if (value) renderQuestions()
    else {
      const msg = $('savemsg')
      if (msg) msg.textContent = 'Write something first'
    }
  })
  $('editbtn')?.addEventListener('click', () => {
    qEditing = qIdx
    renderQuestions()
  })
}

function huntables() {
  return $('reader').querySelectorAll('.huntable')
}

function markedCorrect() {
  return [...huntables()].filter((el) => el.dataset.correct === '1' && el.classList.contains('marked')).length
}

function totalCorrect() {
  return [...huntables()].filter((el) => el.dataset.correct === '1').length
}

function huntStatus(found) {
  const need = needCount()
  if (need > 1) {
    return `Tap the clues in the passage — find at least <b>${need}</b>. Found: <b>${found}</b>`
  }
  return 'Tap the clue in the passage that answers the question.'
}

function bindToggles() {
  huntables().forEach((el) => {
    el.onclick = (event) => {
      event.stopPropagation()
      if (questionDone) return
      el.classList.toggle('marked')
      const found = markedCorrect()
      const hint = $('qhint')
      if (hint) hint.innerHTML = huntStatus(found)
      if (found >= needCount()) revealAll()
    }
  })
}

function startHunt() {
  hunting = true
  questionDone = false
  $('reader').classList.add('hunting')
  huntables().forEach((el) => el.classList.remove('marked', 'right', 'wrong', 'missed'))
  bindToggles()
  renderQuestions()
}

function revealAll() {
  questionDone = true
  huntables().forEach((el) => {
    const correct = el.dataset.correct === '1'
    const marked = el.classList.contains('marked')
    el.classList.remove('marked')
    if (correct) el.classList.add(marked ? 'right' : 'missed')
    else if (marked) el.classList.add('wrong')
  })
  renderQuestions()
}

function paintFeedback() {
  const fb = $('qfb')
  if (!fb) return
  const found = [...huntables()].filter((el) => el.classList.contains('right')).length
  const need = needCount()
  fb.className = 'qfeedback show'
  fb.innerHTML =
    need > 1
      ? `You found <b>${found}</b> of the clues. Here's all the evidence in the passage — <b>${totalCorrect()}</b> in total.`
      : found
        ? "That's it — nicely found."
        : "Here's the clue you were looking for."
}

function clearHunt() {
  questionDone = false
  huntables().forEach((el) => el.classList.remove('marked', 'right', 'wrong', 'missed'))
  bindToggles()
  const hint = $('qhint')
  if (hint) hint.innerHTML = huntStatus(0)
  const fb = $('qfb')
  if (fb) {
    fb.className = 'qfeedback'
    fb.innerHTML = ''
  }
}

function exitHunt() {
  hunting = false
  questionDone = false
  const reader = $('reader')
  if (!reader) return
  reader.classList.remove('hunting')
  reader.querySelectorAll('.huntable').forEach((el) => {
    el.classList.remove('marked', 'right', 'wrong', 'missed')
    el.onclick = null
  })
}

/* ---- wiring ---- */

document.querySelectorAll('.booktab').forEach((t) =>
  t.addEventListener('click', () => {
    exitHunt()
    qEditing = -1
    bookKey = t.dataset.b
    povIdx = 0
    beatIdx = 0
    qIdx = 0
    render(true)
  }),
)

$('pp').addEventListener('click', () => controller?.toggle())
$('bigplay').addEventListener('click', () => controller?.toggle())

let scrubbing = false
const seekFromEvent = (clientX) => {
  const r = $('seek').getBoundingClientRect()
  controller?.seekTo(Math.max(0, Math.min(1, (clientX - r.left) / r.width)))
}
$('seek').addEventListener('pointerdown', (e) => {
  scrubbing = true
  $('seek').setPointerCapture(e.pointerId)
  seekFromEvent(e.clientX)
})
$('seek').addEventListener('pointermove', (e) => {
  if (scrubbing) seekFromEvent(e.clientX)
})
$('seek').addEventListener('pointerup', () => {
  scrubbing = false
})

render(true)
