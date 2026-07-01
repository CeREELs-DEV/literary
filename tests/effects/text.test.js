import { describe, it, expect, beforeEach } from 'vitest'
import { showText } from '../../src/effects/text.js'

function makeStage() {
  const stage = document.createElement('div')
  stage.innerHTML = '<p id="beat-text"></p><p id="beat-caption"></p>'
  return stage
}

describe('showText', () => {
  let stage
  beforeEach(() => { stage = makeStage() })

  it('displays the original text', () => {
    showText(stage, { text: 'The door slammed shut.' })
    expect(stage.querySelector('#beat-text').textContent).toBe('The door slammed shut.')
  })

  it('displays the amplified caption', () => {
    showText(stage, { text: 'The door slammed shut.', caption: 'The whole house shuddered' })
    expect(stage.querySelector('#beat-caption').textContent).toBe('The whole house shuddered')
  })

  it('clears the caption when none is given', () => {
    stage.querySelector('#beat-caption').textContent = 'previous caption'
    showText(stage, { text: 'x' })
    expect(stage.querySelector('#beat-caption').textContent).toBe('')
  })
})
