// tests/cinema.test.js
import { describe, it, expect, vi } from 'vitest'
import { createCinema } from '../src/cinema.js'

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
    id: 's', title: 't', keyBeatIndex: 1,
    beats: [
      { text: 'First line', duration: 1, effects: [] },
      { text: 'Key line', duration: 1, effects: [] },
    ],
  }

  it('open() shows the overlay with the key beat subtitle and a looping source', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ filmUrl: '/api/media/film-1.mp4', scene, beatIndex: 1 })
    expect(dom.root.classList.contains('hidden')).toBe(false)
    expect(dom.video.getAttribute('src')).toBe('/api/media/film-1.mp4')
    expect(dom.video.loop).toBe(true)
    expect(dom.subtitle.textContent).toBe('Key line')
  })

  it('close() hides the overlay and notifies onClose', () => {
    const dom = makeDom()
    const onClose = vi.fn()
    const cinema = createCinema(dom, { onClose })
    cinema.open({ filmUrl: '/x.mp4', scene, beatIndex: 0 })
    dom.closeBtn.click()
    expect(dom.root.classList.contains('hidden')).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})
