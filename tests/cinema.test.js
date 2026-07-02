// tests/cinema.test.js
import { describe, it, expect, vi } from 'vitest'
import { beatIndexForTime, createCinema } from '../src/cinema.js'

describe('beatIndexForTime', () => {
  // first segment 8s, each extension 7s
  it('maps playback time to the beat being shown', () => {
    expect(beatIndexForTime(0, 4)).toBe(0)
    expect(beatIndexForTime(7.9, 4)).toBe(0)
    expect(beatIndexForTime(8, 4)).toBe(1)
    expect(beatIndexForTime(14.9, 4)).toBe(1)
    expect(beatIndexForTime(15, 4)).toBe(2)
    expect(beatIndexForTime(22, 4)).toBe(3)
    expect(beatIndexForTime(999, 4)).toBe(3) // clamped to last beat
  })
})

describe('createCinema', () => {
  function makeDom() {
    document.body.innerHTML = `
      <div id="cinema" class="hidden">
        <video id="film-video"></video>
        <p id="film-subtitle"></p>
        <button id="cinema-close" type="button">✕</button>
      </div>`
    return {
      root: document.getElementById('cinema'),
      video: document.getElementById('film-video'),
      subtitle: document.getElementById('film-subtitle'),
      closeBtn: document.getElementById('cinema-close'),
    }
  }

  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'First line', duration: 1, effects: [] },
      { text: 'Second line', duration: 1, effects: [] },
    ],
  }

  it('open() shows the overlay, sets the source, and starts with beat 0 subtitle', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ filmUrl: '/api/media/film-1.mp4', scene })
    expect(dom.root.classList.contains('hidden')).toBe(false)
    expect(dom.video.getAttribute('src')).toBe('/api/media/film-1.mp4')
    expect(dom.subtitle.textContent).toBe('First line')
  })

  it('updates the subtitle from video time', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ filmUrl: '/x.mp4', scene })
    Object.defineProperty(dom.video, 'currentTime', { value: 9, configurable: true })
    dom.video.dispatchEvent(new Event('timeupdate'))
    expect(dom.subtitle.textContent).toBe('Second line')
  })

  it('close() hides the overlay and notifies onClose', () => {
    const dom = makeDom()
    const onClose = vi.fn()
    const cinema = createCinema(dom, { onClose })
    cinema.open({ filmUrl: '/x.mp4', scene })
    dom.closeBtn.click()
    expect(dom.root.classList.contains('hidden')).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})
