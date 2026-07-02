// src/cinema.js

const FIRST_SEGMENT_S = 8
const EXTENSION_S = 7

// Which beat is on screen at playback time t (seconds)?
export function beatIndexForTime(t, beatCount) {
  if (t < FIRST_SEGMENT_S) return 0
  const i = 1 + Math.floor((t - FIRST_SEGMENT_S) / EXTENSION_S)
  return Math.min(i, beatCount - 1)
}

// Fullscreen film player: full-bleed video (native Veo audio), thin subtitle bar.
export function createCinema({ root, video, subtitle, closeBtn }, { onClose } = {}) {
  let beats = []

  function showSubtitle(index) {
    subtitle.textContent = beats[index]?.text ?? ''
  }

  video.addEventListener('timeupdate', () => {
    if (!beats.length) return
    showSubtitle(beatIndexForTime(video.currentTime, beats.length))
  })

  function open({ filmUrl, scene }) {
    beats = scene.beats
    video.setAttribute('src', filmUrl)
    video.muted = false // the film carries Veo's native audio
    root.classList.remove('hidden')
    showSubtitle(0)
    video.play?.()?.catch(() => {})
  }

  function close() {
    video.pause?.()
    root.classList.add('hidden')
    onClose?.()
  }

  closeBtn.addEventListener('click', close)

  return { open, close }
}
