// src/main.js — Matter of Perspective
//
// One structure, three sample books: the reader on the left is split into
// clickable beat blocks; the scene column plays the beat from the chosen
// point of view. Snicker cells play real pre-produced films; the other
// books show ink storyboard mockups until their films are produced.
import { BOOKS } from './books-data.js'

const $ = (id) => document.getElementById(id)

const ICON = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6.6 10-6.6S22 12 22 12s-3.6 6.6-10 6.6S2 12 2 12z"/><circle cx="12" cy="12" r="2.7"/></svg>',
  frame: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9h19"/><circle cx="6" cy="7" r="0.6" fill="currentColor"/><circle cx="9" cy="7" r="0.6" fill="currentColor"/></svg>',
}

let bookKey = 'snicker'
let povIdx = 0
let beatIdx = 0

const B = () => BOOKS[bookKey]
const cellKey = () => `${B().povs[povIdx].key}|${B().beats[beatIdx].key}`

/* ---- reader ---- */

function renderReader() {
  const b = B()
  $('reader').innerHTML =
    `<div class="chap">${b.author} &middot; ${b.chap}</div>` +
    `<div class="passagename">&ldquo;${b.passage}&rdquo;</div>` +
    `<div class="byline"></div><div class="excerpt">${b.excerpt}</div>`
  // Tap a beat in the text -> the scene jumps there and plays.
  $('reader').querySelectorAll('.beatblock').forEach((el) =>
    el.addEventListener('click', () => {
      beatIdx = +el.dataset.beat
      render(false)
      controller?.play()
    }),
  )
  syncBeatBlocks()
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
  syncBeatBlocks()
}

/* ---- wiring ---- */

document.querySelectorAll('.booktab').forEach((t) =>
  t.addEventListener('click', () => {
    bookKey = t.dataset.b
    povIdx = 0
    beatIdx = 0
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
