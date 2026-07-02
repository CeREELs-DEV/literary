// tests/samples.test.js
import { describe, it, expect, vi } from 'vitest'
import { loadSampleBook, manifestToScene, originalsByIndex } from '../src/samples.js'

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

describe('originalsByIndex', () => {
  it('maps flattened beat indexes to their canonical cards', () => {
    const map = originalsByIndex(manifest)
    expect(map.size).toBe(2)
    expect(map.get(0)).toMatchObject({
      label: 'Original',
      still: '/samples/still-page-1-0.jpg',
      clip: '/samples/remix-1.mp4',
      audio: ['/samples/speech-1.mp3'],
    })
    expect(map.get(1)).toMatchObject({ clip: null, audio: [] })
  })
})
