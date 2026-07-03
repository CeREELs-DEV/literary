// tests/samples.test.js
import { describe, it, expect, vi } from 'vitest'
import { loadSampleBook, manifestToScene, versionsByIndex } from '../src/samples.js'

const manifest = {
  title: 'A Snicker of Magic',
  pages: [
    {
      source: 'excerpt',
      sceneTitle: 'The Beedle',
      beats: [
        {
          text: '"Pumpernickel?" I whispered.',
          versions: [
            { id: 'original', label: 'Original', clip: '/samples/clip-original-1.mp4', audio: ['/samples/speech-1.mp3'] },
            { id: 'joseon', label: 'Joseon Korea', clip: '/samples/clip-joseon-1.mp4', audio: ['/samples/speech-2.mp3'] },
          ],
        },
        {
          text: 'The boy glanced up then.',
          versions: [],
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
      { text: '"Pumpernickel?" I whispered.' },
      { text: 'The boy glanced up then.' },
    ])
  })
})

describe('versionsByIndex', () => {
  it('maps flattened beat indexes to their pre-generated version tabs', () => {
    const map = versionsByIndex(manifest)
    expect(map.size).toBe(2)
    expect(map.get(0)).toHaveLength(2)
    expect(map.get(0)[0]).toMatchObject({
      label: 'Original',
      clip: '/samples/clip-original-1.mp4',
      audio: ['/samples/speech-1.mp3'],
    })
    expect(map.get(0)[1]).toMatchObject({ label: 'Joseon Korea' })
    expect(map.get(1)).toEqual([])
  })

  it('adapts older single-card manifests into a lone Original version', () => {
    const legacy = {
      title: 'Old',
      pages: [
        {
          beats: [
            { text: 'x', still: '/samples/s.jpg', clip: '/samples/c.mp4', audio: [] },
          ],
        },
      ],
    }
    const map = versionsByIndex(legacy)
    expect(map.get(0)).toEqual([
      { label: 'Original', still: '/samples/s.jpg', clip: '/samples/c.mp4', audio: [] },
    ])
  })
})
