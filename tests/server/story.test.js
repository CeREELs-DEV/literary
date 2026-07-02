// tests/server/story.test.js
import { describe, it, expect } from 'vitest'
import { passageText } from '../../server/story.js'

describe('passageText', () => {
  it('joins all beat texts into the full passage', () => {
    const scene = {
      beats: [{ text: 'The wind rose.' }, { text: 'The door slammed shut.' }],
    }
    expect(passageText(scene)).toBe('The wind rose. The door slammed shut.')
  })

  it('truncates very long passages', () => {
    const scene = { beats: [{ text: 'x'.repeat(2000) }] }
    const out = passageText(scene)
    expect(out.length).toBeLessThanOrEqual(1501)
    expect(out.endsWith('…')).toBe(true)
  })
})
