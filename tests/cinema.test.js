// tests/cinema.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCinema } from '../src/cinema.js'

function makeDom() {
  document.body.innerHTML = `
    <div id="cinema" class="hidden">
      <video id="film-video"></video>
      <img id="film-image" class="hidden" />
      <p id="imagining-label"></p>
      <p id="film-subtitle"></p>
      <div id="question-card" class="hidden">
        <button id="cinema-replay" type="button">replay</button>
      </div>
      <button id="cinema-close" type="button">✕</button>
    </div>`
  return {
    root: document.getElementById('cinema'),
    video: document.getElementById('film-video'),
    image: document.getElementById('film-image'),
    subtitle: document.getElementById('film-subtitle'),
    label: document.getElementById('imagining-label'),
    questionCard: document.getElementById('question-card'),
    closeBtn: document.getElementById('cinema-close'),
    replayBtn: document.getElementById('cinema-replay'),
  }
}

const playlist = [
  { title: 'Through her eyes', filmUrl: '/api/media/film-1.mp4', imageSrc: null, text: 'The door slammed shut.' },
  { title: 'From the rafters', filmUrl: null, imageSrc: 'data:image/png;base64,aW1n', text: 'The door slammed shut.' },
]

describe('createCinema — Rashomon playlist', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('open() plays the first imagining with its label and subtitle', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ playlist })
    expect(dom.root.classList.contains('hidden')).toBe(false)
    expect(dom.label.textContent).toBe('Imagination 1 of 2 — Through her eyes')
    expect(dom.subtitle.textContent).toBe('The door slammed shut.')
    expect(dom.video.getAttribute('src')).toBe('/api/media/film-1.mp4')
    expect(dom.video.classList.contains('hidden')).toBe(false)
    expect(dom.questionCard.classList.contains('hidden')).toBe(true)
  })

  it('advances to the next imagining when a film ends, showing image fallbacks', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ playlist })
    dom.video.onended()
    expect(dom.label.textContent).toBe('Imagination 2 of 2 — From the rafters')
    expect(dom.image.classList.contains('hidden')).toBe(false)
    expect(dom.image.getAttribute('src')).toBe('data:image/png;base64,aW1n')
    expect(dom.video.classList.contains('hidden')).toBe(true)
  })

  it('ends on the question card after the last imagining', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ playlist })
    dom.video.onended() // -> image fallback item
    vi.advanceTimersByTime(6000) // image dwell time elapses
    expect(dom.questionCard.classList.contains('hidden')).toBe(false)
    expect(dom.label.textContent).toBe('')
  })

  it('replay restarts from the first imagining', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ playlist })
    dom.video.onended()
    vi.advanceTimersByTime(6000)
    dom.replayBtn.click()
    expect(dom.questionCard.classList.contains('hidden')).toBe(true)
    expect(dom.label.textContent).toBe('Imagination 1 of 2 — Through her eyes')
  })

  it('close() hides the overlay and notifies onClose', () => {
    const dom = makeDom()
    const onClose = vi.fn()
    const cinema = createCinema(dom, { onClose })
    cinema.open({ playlist })
    dom.closeBtn.click()
    expect(dom.root.classList.contains('hidden')).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})
