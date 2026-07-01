import { describe, it, expect } from 'vitest'
import { validateScene } from '../../src/model/scene.js'

describe('validateScene', () => {
  const validScene = {
    id: 'sample',
    title: '샘플',
    beats: [
      { text: '문이 닫혔다.', duration: 1000, effects: [{ type: 'shake', intensity: 'high' }] },
    ],
  }

  it('유효한 씬은 그대로 반환한다', () => {
    expect(validateScene(validScene)).toEqual(validScene)
  })

  it('id가 없으면 던진다', () => {
    expect(() => validateScene({ ...validScene, id: undefined })).toThrow(/id/)
  })

  it('beats가 비어 있으면 던진다', () => {
    expect(() => validateScene({ ...validScene, beats: [] })).toThrow(/beats/)
  })

  it('beat.duration이 양수가 아니면 던진다', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 0, effects: [] }] }
    expect(() => validateScene(bad)).toThrow(/duration/)
  })

  it('effect.type이 없으면 던진다', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 100, effects: [{ intensity: 'high' }] }] }
    expect(() => validateScene(bad)).toThrow(/type/)
  })
})
