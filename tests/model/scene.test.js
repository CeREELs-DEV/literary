import { describe, it, expect } from 'vitest'
import { validateScene } from '../../src/model/scene.js'

describe('validateScene', () => {
  const validScene = {
    id: 'sample',
    title: 'Sample',
    beats: [
      { text: 'The door slammed shut.', duration: 1000, effects: [{ type: 'shake', intensity: 'high' }] },
    ],
  }

  it('returns a valid scene unchanged', () => {
    expect(validateScene(validScene)).toEqual(validScene)
  })

  it('throws if id is missing', () => {
    expect(() => validateScene({ ...validScene, id: undefined })).toThrow(/id/)
  })

  it('throws if beats is empty', () => {
    expect(() => validateScene({ ...validScene, beats: [] })).toThrow(/beats/)
  })

  it('throws if beat.duration is not positive', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 0, effects: [] }] }
    expect(() => validateScene(bad)).toThrow(/duration/)
  })

  it('throws if effect.type is missing', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 100, effects: [{ intensity: 'high' }] }] }
    expect(() => validateScene(bad)).toThrow(/type/)
  })
})
