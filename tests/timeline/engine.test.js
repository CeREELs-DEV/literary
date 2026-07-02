import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTimelineEngine } from '../../src/timeline/engine.js'

describe('createTimelineEngine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'A', amplifiedCaption: 'AA', duration: 1000,
        effects: [{ type: 'shake', intensity: 'high' }], narration: 'A' },
      { text: 'B', duration: 500, effects: [] },
    ],
  }

  it('applies text/shake/narrate effects on the first beat', () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply })
    engine.play(scene)
    const types = apply.mock.calls.map((c) => c[1].type)
    expect(types).toContain('text')
    expect(types).toContain('shake')
    expect(types).toContain('narrate')
    // the text effect carries the original text and amplified caption
    const textCall = apply.mock.calls.find((c) => c[1].type === 'text')
    expect(textCall[1].text).toBe('A')
    expect(textCall[1].caption).toBe('AA')
  })

  it('advances to the next beat only after duration elapses', () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply })
    engine.play(scene)
    apply.mockClear()
    // not yet at 1000ms -> beat B not applied
    vi.advanceTimersByTime(999)
    expect(apply.mock.calls.find((c) => c[1].text === 'B')).toBeUndefined()
    // 1000ms elapsed -> beat B applied
    vi.advanceTimersByTime(1)
    const bText = apply.mock.calls.find((c) => c[1].type === 'text' && c[1].text === 'B')
    expect(bText).toBeTruthy()
  })

  it('resolves the play promise after all beats finish', async () => {
    const engine = createTimelineEngine({ stage: {}, apply: vi.fn() })
    const done = engine.play(scene)
    await vi.advanceTimersByTimeAsync(1500)
    await expect(done).resolves.toBeUndefined()
  })
})

describe('createTimelineEngine — audio-synced beats', () => {
  const audioScene = {
    id: 's', title: 't',
    beats: [
      {
        text: 'A', duration: 99999, narration: 'A',
        audioUrls: ['/api/media/a1.mp3', '/api/media/a2.mp3'],
        effects: [],
      },
      { text: 'B', duration: 1, effects: [] },
    ],
  }

  it('advances when the audio chain ends instead of the fixed duration', async () => {
    const apply = vi.fn()
    const played = []
    const playAudio = vi.fn(async (url) => { played.push(url) })
    const engine = createTimelineEngine({ stage: {}, apply, playAudio })
    await engine.play(audioScene)
    expect(played).toEqual(['/api/media/a1.mp3', '/api/media/a2.mp3'])
    // beat B was reached without waiting 99999ms
    expect(apply.mock.calls.some((c) => c[1].type === 'text' && c[1].text === 'B')).toBe(true)
  })

  it('does not trigger browser TTS narrate when audioUrls are present', async () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply, playAudio: async () => {} })
    await engine.play(audioScene)
    const narrateForA = apply.mock.calls.find(
      (c) => c[1].type === 'narrate' && c[1].text === 'A',
    )
    expect(narrateForA).toBeUndefined()
  })

  it('advances past a stalled audio chain via the stall-guard cap', async () => {
    vi.useFakeTimers()
    try {
      const apply = vi.fn()
      const playAudio = vi.fn(() => new Promise(() => {})) // never resolves
      const engine = createTimelineEngine({ stage: {}, apply, playAudio })
      const done = engine.play(audioScene)
      // cap is 15000ms * 2 audioUrls; then beat B's tiny duration (1ms)
      await vi.advanceTimersByTimeAsync(15000 * 2 + 1)
      await expect(done).resolves.toBeUndefined()
      expect(apply.mock.calls.some((c) => c[1].type === 'text' && c[1].text === 'B')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
