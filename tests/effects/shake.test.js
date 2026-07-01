import { describe, it, expect, beforeEach } from 'vitest'
import { shake } from '../../src/effects/shake.js'

describe('shake', () => {
  let stage
  beforeEach(() => {
    stage = document.createElement('div')
    document.body.appendChild(stage)
  })

  it('high 강도는 shake-high 클래스를 붙인다', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    expect(stage.classList.contains('shake-high')).toBe(true)
    expect(stage.style.getPropertyValue('--shake-dur')).toBe('600ms')
  })

  it('기본 강도는 shake-low 클래스를 붙인다', () => {
    shake(stage, {})
    expect(stage.classList.contains('shake-low')).toBe(true)
  })

  it('animationend 이후 클래스를 제거한다', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    stage.dispatchEvent(new Event('animationend'))
    expect(stage.classList.contains('shake-high')).toBe(false)
  })
})
