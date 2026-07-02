// tests/samples.test.js
import { describe, it, expect, vi } from 'vitest'
import { loadSampleBook, manifestToScene, renderOriginalCards } from '../src/samples.js'

const manifest = {
  title: 'A Snicker of Magic',
  pages: [
    {
      photo: 'page-1.jpg',
      sceneTitle: 'Arriving',
      beats: [
        {
          text: '"Home," she whispered.',
          still: '/samples/still-page-1-0.jpg',
          clip: '/samples/remix-1.mp4',
          audio: ['/samples/speech-1.mp3'],
        },
        {
          text: 'The van rolled into Midnight Gulch.',
          still: '/samples/still-page-1-1.jpg',
          clip: null,
          audio: [],
        },
      ],
    },
  ],
}

describe('loadSampleBook', () => {
  it('returns the manifest when present', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => manifest }))
    expect(await loadSampleBook(fetchImpl)).toEqual(manifest)
  })

  it('returns null when samples are not built', async () => {
    expect(await loadSampleBook(vi.fn(async () => ({ ok: false })))).toBeNull()
    expect(await loadSampleBook(vi.fn(async () => { throw new Error('net') }))).toBeNull()
  })
})

describe('manifestToScene', () => {
  it('flattens pages into the e-book scene shape', () => {
    const scene = manifestToScene(manifest)
    expect(scene.title).toBe('A Snicker of Magic')
    expect(scene.beats).toEqual([
      { text: '"Home," she whispered.' },
      { text: 'The van rolled into Midnight Gulch.' },
    ])
  })
})

describe('renderOriginalCards', () => {
  it('renders one card per beat with loop video and audio marker', () => {
    document.body.innerHTML = '<div id="g"></div>'
    const gallery = document.getElementById('g')
    const count = renderOriginalCards(manifest, gallery)
    expect(count).toBe(2)
    const cards = gallery.querySelectorAll('.remix-card.original')
    expect(cards).toHaveLength(2)
    expect(cards[0].querySelector('video').getAttribute('src')).toBe('/samples/remix-1.mp4')
    expect(cards[0].querySelector('.remix-label').textContent).toContain('Original')
    expect(cards[0].querySelector('.remix-label').textContent).toContain('🔊')
    expect(cards[1].querySelector('video')).toBeNull() // still-only card
  })

  it('plays dialogue audio in order on click', async () => {
    document.body.innerHTML = '<div id="g"></div>'
    const gallery = document.getElementById('g')
    const played = []
    const audioFactory = vi.fn((url) => {
      const fake = { play: () => { played.push(url); fake.onended?.() } }
      return fake
    })
    renderOriginalCards(manifest, gallery, { audioFactory })
    gallery.querySelector('.remix-card.has-audio').click()
    await new Promise((r) => setTimeout(r, 0))
    expect(played).toEqual(['/samples/speech-1.mp3'])
  })
})
