// tests/viewer.test.js
import { describe, it, expect, vi } from 'vitest'
import { createPassageViewer } from '../src/viewer.js'

function makeDom() {
  document.body.innerHTML = `
    <div id="passage-viewer" class="hidden">
      <div id="version-tabs"></div>
      <div id="viewer-card"></div>
    </div>`
  return {
    root: document.getElementById('passage-viewer'),
    tabs: document.getElementById('version-tabs'),
    card: document.getElementById('viewer-card'),
  }
}

const original = {
  label: 'Original',
  still: '/samples/still-0.jpg',
  clip: '/samples/remix-0.mp4',
  audio: ['/samples/speech-0.mp3'],
}

describe('createPassageViewer', () => {
  it('show() opens the Original tab with its loop and plays the dialogue', async () => {
    const dom = makeDom()
    const played = []
    const audioFactory = vi.fn((url) => {
      const fake = { play: () => { played.push(url); fake.onended?.() }, pause: () => {} }
      return fake
    })
    const viewer = createPassageViewer(dom, { audioFactory })
    viewer.setOriginal(2, original)
    viewer.show(2)
    await new Promise((r) => setTimeout(r, 0)) // let the audio chain start
    expect(dom.root.classList.contains('hidden')).toBe(false)
    const tabBtns = dom.tabs.querySelectorAll('.version-tab')
    expect(tabBtns).toHaveLength(1)
    expect(tabBtns[0].textContent).toBe('Original')
    expect(tabBtns[0].classList.contains('active')).toBe(true)
    expect(dom.card.querySelector('video').getAttribute('src')).toBe('/samples/remix-0.mp4')
    expect(played).toEqual(['/samples/speech-0.mp3'])
  })

  it('addTransform() adds a tab and switches to it when the passage is open', () => {
    const dom = makeDom()
    const viewer = createPassageViewer(dom, { audioFactory: () => ({ play: () => {}, pause: () => {} }) })
    viewer.setOriginal(0, original)
    viewer.show(0)
    viewer.addTransform(0, { label: '1800s Joseon Korea', still: '/api/media/x.jpg', clip: null })
    const tabBtns = dom.tabs.querySelectorAll('.version-tab')
    expect([...tabBtns].map((b) => b.textContent)).toEqual(['Original', '1800s Joseon Korea'])
    expect(tabBtns[1].classList.contains('active')).toBe(true)
    expect(dom.card.querySelector('img').getAttribute('src')).toBe('/api/media/x.jpg')
    expect(dom.card.querySelector('video')).toBeNull()
  })

  it('updateTransform() patches the visible card when the loop arrives', () => {
    const dom = makeDom()
    const viewer = createPassageViewer(dom, { audioFactory: () => ({ play: () => {}, pause: () => {} }) })
    viewer.show(1)
    const id = viewer.addTransform(1, { label: 'Space colony', still: '/api/media/s.jpg', clip: null })
    viewer.updateTransform(1, id, { clip: '/api/media/loop.mp4' })
    expect(dom.card.querySelector('video').getAttribute('src')).toBe('/api/media/loop.mp4')
  })

  it('clicking tabs switches versions; transforms do not autoplay dialogue', async () => {
    const dom = makeDom()
    const played = []
    const audioFactory = vi.fn((url) => {
      const fake = { play: () => { played.push(url); fake.onended?.() }, pause: () => {} }
      return fake
    })
    const viewer = createPassageViewer(dom, { audioFactory })
    viewer.setOriginal(0, original)
    viewer.show(0) // plays once
    viewer.addTransform(0, { label: 'Medieval Europe', still: '/x.jpg', clip: null }) // switches away
    await new Promise((r) => setTimeout(r, 0))
    played.length = 0
    const tabBtns = dom.tabs.querySelectorAll('.version-tab')
    tabBtns[0].click() // back to Original
    await new Promise((r) => setTimeout(r, 0))
    expect(played).toEqual(['/samples/speech-0.mp3'])
  })

  it('show() on a passage with nothing yet renders an empty viewer', () => {
    const dom = makeDom()
    const viewer = createPassageViewer(dom)
    viewer.show(5)
    expect(dom.tabs.querySelectorAll('.version-tab')).toHaveLength(0)
    expect(dom.card.innerHTML).toBe('')
  })
})
