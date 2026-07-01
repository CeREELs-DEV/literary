import { describe, it, expect, beforeEach } from 'vitest'
import { shake } from '../../src/effects/shake.js'

describe('shake', () => {
  let stage
  beforeEach(() => {
    stage = document.createElement('div')
    document.body.appendChild(stage)
  })

  it('applies the shake-high class for high intensity', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    expect(stage.classList.contains('shake-high')).toBe(true)
    expect(stage.style.getPropertyValue('--shake-dur')).toBe('600ms')
  })

  it('applies the shake-low class by default', () => {
    shake(stage, {})
    expect(stage.classList.contains('shake-low')).toBe(true)
  })

  it('removes the class after animationend', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    stage.dispatchEvent(new Event('animationend'))
    expect(stage.classList.contains('shake-high')).toBe(false)
  })
})
