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
