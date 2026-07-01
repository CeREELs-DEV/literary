import { applyEffect } from '../effects/registry.js'

export function createTimelineEngine({ stage, apply = applyEffect } = {}) {
  function playBeat(beat) {
    // 1) original text + amplified caption
    apply(stage, { type: 'text', text: beat.text, caption: beat.amplifiedCaption ?? '' })
    // 2) sensory effects defined on the beat
    for (const effect of beat.effects) {
      apply(stage, effect)
    }
    // 3) (optional) narration
    if (beat.narration) {
      apply(stage, { type: 'narrate', text: beat.narration })
    }
  }

  function play(scene) {
    return new Promise((resolve) => {
      const beats = scene.beats
      let index = 0

      function next() {
        if (index >= beats.length) {
          resolve()
          return
        }
        const beat = beats[index]
        index += 1
        playBeat(beat)
        setTimeout(next, beat.duration)
      }

      next()
    })
  }

  return { play }
}
