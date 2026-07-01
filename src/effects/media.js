// Play a vibration/sound-effect/ambient sound. src is a static asset path.
export function playSound(stage, { src, volume = 1 } = {}) {
  if (!src) return
  const audio = new Audio(src)
  audio.volume = volume
  audio.play?.()?.catch(() => {}) // silently ignore autoplay blocks, etc.
}

// Play a background video clip (Tier 1: pre-made clip / falls back to background color if absent)
export function playClip(stage, { src } = {}) {
  const layer = stage.querySelector('#clip-layer')
  if (!layer) return
  layer.innerHTML = ''
  if (!src) return
  const video = document.createElement('video')
  video.src = src
  video.autoplay = true
  video.muted = true
  video.loop = false
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'cover'
  layer.appendChild(video)
  video.play?.()?.catch(() => {})
}

// Show a still illustration (Tier 2 preview)
export function showImage(stage, { src } = {}) {
  const layer = stage.querySelector('#image-layer')
  if (!layer) return
  layer.style.backgroundImage = src ? `url("${src}")` : 'none'
}

// Narration: prefers an audio file (src), falls back to the browser's SpeechSynthesis
export function narrate(stage, { src, text } = {}) {
  if (src) {
    const audio = new Audio(src)
    audio.play?.()?.catch(() => {})
    return
  }
  if (text && typeof speechSynthesis !== 'undefined') {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'en-US'
    speechSynthesis.speak(utter)
  }
}
