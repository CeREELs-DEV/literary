import { applyEffect } from '../effects/registry.js'

// Play a pre-generated narration file; resolve when it ends (or fails).
// `register` receives a cancel function that pauses the audio and resolves early.
function defaultPlayAudio(url, { register } = {}) {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    register?.(() => {
      audio.pause()
      resolve()
    })
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
  let session = 0
  let cancelCurrent = null // stops the in-flight audio or pending timer

  function stop() {
    session += 1
    cancelCurrent?.()
    cancelCurrent = null
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
  }

  function play(scene) {
    stop()
    const mySession = session
    return new Promise((resolve) => {
      const beats = scene.beats
      let index = 0

      function next() {
        if (mySession !== session) {
          resolve()
          return
        }
        // Hard boundary between beats: whatever audio/timer the previous beat
        // left behind is silenced before the next one starts (no voice overlap).
        cancelCurrent?.()
        cancelCurrent = null
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
            (acc, url) =>
              acc.then(() => {
                if (mySession !== session) return undefined
                // Silence the previous segment before the next one speaks.
                cancelCurrent?.()
                return playAudio(url, { register: (cancel) => { cancelCurrent = cancel } })
              }),
            Promise.resolve(),
          )
          // Stall guard: a media element that never fires ended/error must not hang the scene.
          const cap = new Promise((r) => setTimeout(r, 15000 * beat.audioUrls.length))
          Promise.race([chain, cap]).then(next)
        } else {
          if (beat.narration) {
            apply(stage, { type: 'narrate', text: beat.narration })
          }
          const timer = setTimeout(next, beat.duration)
          cancelCurrent = () => clearTimeout(timer)
        }
      }

      next()
    })
  }

  return { play, stop }
}
