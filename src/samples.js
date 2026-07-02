// src/samples.js

// Load the pre-generated sample book (public/samples/manifest.json).
// Returns null when no samples have been built yet.
export async function loadSampleBook(fetchImpl = fetch) {
  try {
    const res = await fetchImpl('/samples/manifest.json')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

// Flatten the manifest into the scene shape the e-book renderer expects.
export function manifestToScene(manifest) {
  return {
    id: 'sample-book',
    title: manifest.title,
    beats: manifest.pages.flatMap((page) => page.beats.map((b) => ({ text: b.text }))),
  }
}

// Render the canonical "original" cards into the remix gallery. Cards with
// dialogue audio play their voice track on click. Returns the card count.
export function renderOriginalCards(manifest, gallery, { audioFactory = (url) => new Audio(url) } = {}) {
  let count = 0
  for (const page of manifest.pages) {
    for (const beat of page.beats) {
      if (!beat.still) continue
      const card = document.createElement('div')
      card.className = 'remix-card original'

      const frame = document.createElement('div')
      frame.className = 'frame revealed'
      const img = document.createElement('img')
      img.src = beat.still
      img.alt = beat.text
      frame.appendChild(img)
      if (beat.clip) {
        const video = document.createElement('video')
        video.src = beat.clip
        video.muted = true
        video.loop = true
        video.autoplay = true
        video.playsInline = true
        video.className = 'live'
        frame.appendChild(video)
      }
      card.appendChild(frame)

      const label = document.createElement('p')
      label.className = 'remix-label'
      const firstWords = beat.text.split(' ').slice(0, 6).join(' ')
      label.textContent = `Original · ${firstWords}${beat.audio.length ? ' · 🔊' : ''}`
      card.appendChild(label)

      if (beat.audio.length) {
        card.classList.add('has-audio')
        card.addEventListener('click', () => {
          // Play the dialogue segments in order.
          beat.audio
            .reduce(
              (chain, url) =>
                chain.then(
                  () =>
                    new Promise((resolve) => {
                      const audio = audioFactory(url)
                      audio.onended = resolve
                      audio.onerror = resolve
                      const playing = audio.play?.()
                      playing?.catch?.(() => resolve())
                    }),
                ),
              Promise.resolve(),
            )
            .catch(() => {})
        })
      }

      gallery.appendChild(card)
      count += 1
    }
  }
  return count
}
