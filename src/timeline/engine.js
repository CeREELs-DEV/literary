import { applyEffect } from '../effects/registry.js'

// Play a pre-generated narration file; resolve when it ends (or fails).
function defaultPlayAudio(url) {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    audio.onended = resolve
    audio.onerror = resolve
    const playing = audio.play?.()
    playing?.catch(() => resolve())
  })
}

export function createTimelineEngine({
  stage,
  apply = applyEffect,
  playAudio = defaultPlayAudio,
} = {}) {
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
        // 1) original text + amplified caption
        apply(stage, { type: 'text', text: beat.text, caption: beat.amplifiedCaption ?? '' })
        // 2) the beat's sensory effects
        for (const effect of beat.effects) {
          apply(stage, effect)
        }
        // 3) narration: pre-generated audio syncs the beat; otherwise browser TTS + timer
        if (beat.audioUrls?.length) {
          const chain = beat.audioUrls.reduce(
            (acc, url) => acc.then(() => playAudio(url)),
            Promise.resolve(),
          )
          // Stall guard: a media element that never fires ended/error must not hang the scene.
          const cap = new Promise((resolve) => setTimeout(resolve, 15000 * beat.audioUrls.length))
          Promise.race([chain, cap]).then(next)
        } else {
          if (beat.narration) {
            apply(stage, { type: 'narrate', text: beat.narration })
          }
          setTimeout(next, beat.duration)
        }
      }

      next()
    })
  }

  return { play }
}
