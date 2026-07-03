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

const versions = [
  {
    label: 'Original',
    clip: '/samples/clip-original-0.mp4',
    audio: ['/samples/speech-0.mp3'],
  },
  {
    label: 'Joseon Korea',
    clip: '/samples/clip-joseon-0.mp4',
    audio: ['/samples/speech-1.mp3'],
  },
]

function recordingAudioFactory(played) {
  return vi.fn((url) => {
    const fake = { play: () => { played.push(url); fake.onended?.() }, pause: () => {} }
    return fake
  })
}

describe('createPassageViewer', () => {
  it('show() opens the first (Original) tab with its clip and plays its audio', async () => {
    const dom = makeDom()
    const played = []
    const viewer = createPassageViewer(dom, { audioFactory: recordingAudioFactory(played) })
    viewer.setVersions(2, versions)
    viewer.show(2)
    await new Promise((r) => setTimeout(r, 0)) // let the audio chain start
    expect(dom.root.classList.contains('hidden')).toBe(false)
    const tabBtns = dom.tabs.querySelectorAll('.version-tab')
    expect([...tabBtns].map((b) => b.textContent)).toEqual(['Original', 'Joseon Korea'])
    expect(tabBtns[0].classList.contains('active')).toBe(true)
    expect(dom.card.querySelector('video').getAttribute('src')).toBe('/samples/clip-original-0.mp4')
    expect(played).toEqual(['/samples/speech-0.mp3'])
  })

  it('clicking a preset era tab switches the clip and plays that version audio', async () => {
    const dom = makeDom()
    const played = []
    const viewer = createPassageViewer(dom, { audioFactory: recordingAudioFactory(played) })
    viewer.setVersions(0, versions)
    viewer.show(0)
    await new Promise((r) => setTimeout(r, 0))
    played.length = 0
    dom.tabs.querySelectorAll('.version-tab')[1].click()
    await new Promise((r) => setTimeout(r, 0))
    expect(dom.card.querySelector('video').getAttribute('src')).toBe('/samples/clip-joseon-0.mp4')
    expect(played).toEqual(['/samples/speech-1.mp3'])
  })

  it('addTransform() adds a tab after the presets and switches to it', () => {
    const dom = makeDom()
    const viewer = createPassageViewer(dom, { audioFactory: () => ({ play: () => {}, pause: () => {} }) })
    viewer.setVersions(0, versions)
    viewer.show(0)
    viewer.addTransform(0, { label: 'Deep Sea Kingdom', still: '/api/media/x.jpg', clip: null })
    const tabBtns = dom.tabs.querySelectorAll('.version-tab')
    expect([...tabBtns].map((b) => b.textContent)).toEqual([
      'Original', 'Joseon Korea', 'Deep Sea Kingdom',
    ])
    expect(tabBtns[2].classList.contains('active')).toBe(true)
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

  it('switching to a transform stops preset audio; back to a preset replays it', async () => {
    const dom = makeDom()
    const played = []
    const viewer = createPassageViewer(dom, { audioFactory: recordingAudioFactory(played) })
    viewer.setVersions(0, versions)
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
