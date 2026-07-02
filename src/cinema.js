// src/cinema.js

const IMAGE_FALLBACK_MS = 6000

// Rashomon cinema: plays the key scene's imaginings in sequence — film when
// available, illustration otherwise — then ends on the "How did YOU imagine
// it?" question card. The point is contrast: one sentence, many pictures.
export function createCinema(
  { root, video, image, subtitle, label, questionCard, closeBtn, replayBtn },
  { onClose } = {},
) {
  let playlist = []
  let timer = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function showQuestionCard() {
    clearTimer()
    video.pause?.()
    video.classList.add('hidden')
    image.classList.add('hidden')
    label.textContent = ''
    subtitle.textContent = ''
    questionCard.classList.remove('hidden')
  }

  function showItem(i) {
    clearTimer()
    if (i >= playlist.length) {
      showQuestionCard()
      return
    }
    const item = playlist[i]
    questionCard.classList.add('hidden')
    label.textContent = `Imagination ${i + 1} of ${playlist.length} — ${item.title}`
    subtitle.textContent = item.text ?? ''
    if (item.filmUrl) {
      image.classList.add('hidden')
      video.classList.remove('hidden')
      video.setAttribute('src', item.filmUrl)
      video.loop = false
      video.muted = false // the film carries Veo's native audio
      video.onended = () => showItem(i + 1)
      video.play?.()?.catch(() => {})
    } else {
      video.pause?.()
      video.classList.add('hidden')
      image.classList.remove('hidden')
      image.setAttribute('src', item.imageSrc)
      timer = setTimeout(() => showItem(i + 1), IMAGE_FALLBACK_MS)
    }
  }

  function open({ playlist: items }) {
    playlist = items
    root.classList.remove('hidden')
    showItem(0)
  }

  function close() {
    clearTimer()
    video.pause?.()
    root.classList.add('hidden')
    onClose?.()
  }

  closeBtn.addEventListener('click', close)
  replayBtn?.addEventListener('click', () => showItem(0))

  return { open, close }
}
