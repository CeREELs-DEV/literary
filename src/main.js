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
let commentsOpen = false
let editingComment = null
const pollState = {}
const commentState = {}

const EYE_BOOK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H20v3H5.5A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 8.4s1.6-2.4 4-2.4 4 2.4 4 2.4-1.6 2.4-4 2.4-4-2.4-4-2.4z"/><circle cx="12" cy="8.4" r="1.1" fill="currentColor" stroke="none"/></svg>'
const BUBBLE =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4 3.5V15H5.5A1.5 1.5 0 0 1 4 13.5z"/><circle cx="9" cy="9.5" r="1"/><circle cx="12" cy="9.5" r="1"/><circle cx="15" cy="9.5" r="1"/></svg>'

const B = () => BOOKS[bookKey]
const cellKey = () => `${B().povs[povIdx].key}|${B().beats[beatIdx].key}`

/* ---- reader ---- */

function renderReader() {
  const b = B()
  $('reader').innerHTML =
    `<div class="chap">${b.author} &middot; ${b.chap}</div>` +
    `<div class="passagename">&ldquo;${b.passage}&rdquo;</div>` +
    `<div class="prow">` +
    `<div class="pchip"><button class="picon" id="povinfo" aria-label="About this story's point of view">${EYE_BOOK}</button>` +
    `<div class="povpop" id="povpop"><div class="pph">Point of view</div>${b.povInfo}</div></div>` +
    `<div class="pchip"><button class="picon" id="thinkbtn" aria-label="Something to think about">${BUBBLE}</button>` +
    `<div class="povpop thinkpop" id="thinkpop"><div class="pph">Think about…</div>${b.think}</div></div>` +
    `</div>` +
    `<div class="byline"></div><div class="recap">${b.setup}</div><div class="excerpt">${b.excerpt}</div>`
  // Tap a beat in the text -> the scene jumps there and plays.
  $('reader').querySelectorAll('.beatblock').forEach((el) =>
    el.addEventListener('click', () => {
      beatIdx = +el.dataset.beat
      render(false)
      controller?.play()
    }),
  )
  wirePop('povinfo', 'povpop')
  wirePop('thinkbtn', 'thinkpop')
  syncBeatBlocks()
}

function wirePop(btnId, popId) {
  const pi = $(btnId)
  const pp = $(popId)
  if (!pi || !pp) return
  let closeT = null
  const open = () => {
    clearTimeout(closeT)
    document.querySelectorAll('.povpop.show').forEach((pop) => {
      if (pop !== pp) pop.classList.remove('show')
    })
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
  renderPoll()
  syncBeatBlocks()
}

/* ---- poll + comments ---- */

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function attr(s) {
  return esc(String(s)).replace(/"/g, '&quot;')
}

function renderPollThumb(poll, i) {
  const src = poll.thumbs?.[i]
  if (!src) return ''

  const bg = poll.thumbBg?.[i]
  const fit = poll.thumbFit?.[i]
  const thumbStyle = bg ? ` style="background:${attr(bg)}"` : ''
  const imageStyle = fit ? ` style="object-fit:${attr(fit)}"` : ''
  return `<span class="pollthumb"${thumbStyle}><img src="${attr(src)}" alt=""${imageStyle}></span>`
}

function pState() {
  if (!pollState[bookKey]) {
    pollState[bookKey] = { voted: null, votes: B().poll.votes.slice() }
  }
  return pollState[bookKey]
}

function cState() {
  if (!commentState[bookKey]) {
    commentState[bookKey] = B().comments.map((comment) => ({ n: comment.n, t: comment.t }))
  }
  return commentState[bookKey]
}

function initials(name) {
  return name.trim().slice(0, 1).toUpperCase()
}

function renderPoll() {
  const b = B()
  const section = $('pollsection')
  if (!section) return
  if (!b.poll) {
    section.innerHTML = ''
    return
  }

  const ps = pState()
  const cs = cState()
  const total = ps.votes.reduce((sum, vote) => sum + vote, 0)
  const thumb = (i) => renderPollThumb(b.poll, i)
  let options

  if (ps.voted === null) {
    options = b.poll.options
      .map(
        (option, i) =>
          `<button class="pollopt" data-i="${i}">` +
          `${thumb(i)}<span class="poplabel">${esc(option)}</span></button>`,
      )
      .join('')
  } else {
    options = b.poll.options
      .map((option, i) => {
        const pct = total ? Math.round((ps.votes[i] / total) * 100) : 0
        return (
          `<div class="pollbar${i === ps.voted ? ' mine' : ''}" data-i="${i}">` +
          `<div class="pbfill" style="width:${pct}%"></div>` +
          thumb(i) +
          `<span class="pblabel">${esc(option)}${i === ps.voted ? ' <span class="pbyou">✓ you</span>' : ''}</span>` +
          `<span class="pbpct">${pct}%</span></div>`
        )
      })
      .join('')
  }

  const commentIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>'
  let commentsInner = ''

  if (commentsOpen) {
    const comments = cs
      .map((comment, idx) => {
        const mine = comment.n === 'You'
        if (mine && editingComment === idx) {
          return (
            '<div class="citem"><div class="cav you">You</div><div class="cbody">' +
            `<textarea class="cinput cedit" id="ceditinput">${esc(comment.t)}</textarea>` +
            `<div class="cactions"><button class="clink" data-save="${idx}">Save</button>` +
            '<button class="clink" data-cancel="1">Cancel</button></div></div></div>'
          )
        }
        return (
          `<div class="citem"><div class="cav${mine ? ' you' : ''}">${mine ? 'You' : initials(comment.n)}</div>` +
          `<div class="cbody"><div class="cname">${esc(comment.n)}</div><div class="ctext">${esc(comment.t)}</div>` +
          (mine
            ? `<div class="cactions"><button class="clink" data-edit="${idx}">Edit</button><button class="clink" data-del="${idx}">Delete</button></div>`
            : '') +
          '</div></div>'
        )
      })
      .join('')

    commentsInner =
      '<div class="cwrap"><div class="cadd"><div class="cav you">You</div>' +
      '<textarea class="cinput" id="cinput" placeholder="Add a comment…" rows="1"></textarea>' +
      '<button class="cpost" id="cpost">Post</button></div>' +
      `<div class="clist">${comments}</div></div>`
  }

  section.innerHTML =
    `<div class="pollcard"><div class="pollq">${esc(b.poll.q)}</div>` +
    `<div class="pollmeta">${total} votes</div>` +
    `<div class="pollopts">${options}</div>` +
    `<div class="pollactions"><button class="cbtn${commentsOpen ? ' open' : ''}" id="ctoggle">` +
    `${commentIcon}<span class="ccount">${cs.length}</span></button></div>` +
    `${commentsInner}</div>`

  section.querySelectorAll('.pollopt,.pollbar').forEach((el) =>
    el.addEventListener('click', () => {
      const i = +el.dataset.i
      const st = pState()
      if (st.voted === i) return
      if (st.voted !== null) st.votes[st.voted] = Math.max(0, st.votes[st.voted] - 1)
      st.votes[i] += 1
      st.voted = i
      renderPoll()
    }),
  )

  $('ctoggle').addEventListener('click', () => {
    commentsOpen = !commentsOpen
    editingComment = null
    renderPoll()
  })

  if (!commentsOpen) return

  const commentInput = $('cinput')
  commentInput?.addEventListener('input', () => {
    commentInput.style.height = 'auto'
    commentInput.style.height = `${Math.min(commentInput.scrollHeight, 120)}px`
  })
  $('cpost')?.addEventListener('click', () => {
    const value = $('cinput').value.trim()
    if (!value) return
    editingComment = null
    cState().unshift({ n: 'You', t: value })
    renderPoll()
  })
  section.querySelectorAll('.clink').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.dataset.edit !== undefined) {
        editingComment = +button.dataset.edit
        renderPoll()
      } else if (button.dataset.cancel !== undefined) {
        editingComment = null
        renderPoll()
      } else if (button.dataset.save !== undefined) {
        const value = $('ceditinput').value.trim()
        const i = +button.dataset.save
        if (value) cState()[i].t = value
        editingComment = null
        renderPoll()
      } else if (button.dataset.del !== undefined) {
        cState().splice(+button.dataset.del, 1)
        editingComment = null
        renderPoll()
      }
    }
  ))
}

/* ---- wiring ---- */

document.querySelectorAll('.booktab').forEach((t) =>
  t.addEventListener('click', () => {
    commentsOpen = false
    editingComment = null
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
