// src/cinema.js

// Fullscreen key-scene player: full-bleed looping video (native Veo audio),
// with the key beat's text as a thin subtitle bar.
export function createCinema({ root, video, subtitle, closeBtn }, { onClose } = {}) {
  function open({ filmUrl, scene, beatIndex = 0 }) {
    subtitle.textContent = scene.beats[beatIndex]?.text ?? ''
    video.setAttribute('src', filmUrl)
    video.muted = false // the film carries Veo's native audio
    video.loop = true // an 8s key scene loops while the child watches
    root.classList.remove('hidden')
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
