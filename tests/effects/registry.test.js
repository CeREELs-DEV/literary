import { describe, it, expect, beforeEach } from 'vitest'
import { applyEffect, effectRegistry } from '../../src/effects/registry.js'

function makeStage() {
  const stage = document.createElement('div')
  stage.innerHTML =
    '<div id="clip-layer"></div><div id="image-layer"></div>' +
    '<div id="flash-layer"></div><p id="beat-text"></p><p id="beat-caption"></p>'
  document.body.appendChild(stage)
  return stage
}

describe('effect registry', () => {
  let stage
  beforeEach(() => { stage = makeStage() })

  it('registers all known effect types as functions', () => {
    for (const type of ['shake', 'flash', 'text', 'sound', 'clip', 'image', 'narrate']) {
      expect(typeof effectRegistry[type]).toBe('function')
    }
  })

  it('applyEffect runs the text effect', () => {
    applyEffect(stage, { type: 'text', text: 'The door slammed shut.' })
    expect(stage.querySelector('#beat-text').textContent).toBe('The door slammed shut.')
  })

  it('applyEffect runs the shake effect', () => {
    applyEffect(stage, { type: 'shake', intensity: 'high', duration: 500 })
    expect(stage.classList.contains('shake-high')).toBe(true)
  })

  it('ignores an unregistered type without throwing', () => {
    expect(() => applyEffect(stage, { type: 'unknown' })).not.toThrow()
  })

  it('does not throw on sound/clip/image/narrate calls', () => {
    expect(() => applyEffect(stage, { type: 'sound', src: 'x.mp3' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'clip', src: 'x.mp4' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'image', src: 'x.png' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'narrate', text: 'hello' })).not.toThrow()
  })
})
