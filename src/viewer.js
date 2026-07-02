// src/viewer.js

// Per-passage viewer: click a highlighted sentence and see THAT scene —
// the Original card (loop + dialogue voices) and any transforms the child
// has made, switchable as tabs. One passage, many ways to imagine it.
export function createPassageViewer(
  { root, tabs, card },
  { audioFactory = (url) => new Audio(url) } = {},
) {
  const state = new Map() // beat index -> { original, transforms: [] }
  let currentIndex = null
  let currentAudio = null

  function entry(index) {
    if (!state.has(index)) state.set(index, { original: null, transforms: [] })
    return state.get(index)
  }

  function stopAudio() {
    currentAudio?.pause?.()
    currentAudio = null
  }

  function playAudioChain(urls) {
    stopAudio()
    urls
      .reduce(
        (chain, url) =>
          chain.then(
            () =>
              new Promise((resolve) => {
                const audio = audioFactory(url)
                currentAudio = audio
                audio.onended = resolve
                audio.onerror = resolve
                const playing = audio.play?.()
                playing?.catch?.(() => resolve())
              }),
          ),
        Promise.resolve(),
      )
      .catch(() => {})
  }

  function renderCard(version) {
    card.innerHTML = ''
    const frame = document.createElement('div')
    frame.className = 'frame revealed'
    if (version.still) {
      const img = document.createElement('img')
      img.src = version.still
      img.alt = version.label ?? ''
      frame.appendChild(img)
    } else {
      frame.classList.add('pending')
    }
    if (version.clip) {
      const video = document.createElement('video')
      video.src = version.clip
      video.muted = true // dialogue/bgm carry the sound
      video.loop = true
      video.autoplay = true
      video.playsInline = true
      video.className = 'live'
      frame.appendChild(video)
      video.play?.()?.catch(() => {})
    }
    card.appendChild(frame)
  }

  function renderTabs(index, active) {
    tabs.innerHTML = ''
    const e = entry(index)
    const make = (label, key, isActive) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `version-tab${isActive ? ' active' : ''}`
      btn.textContent = label
      btn.addEventListener('click', () => selectTab(index, key))
      tabs.appendChild(btn)
    }
    if (e.original) make('Original', 'original', active === 'original')
    e.transforms.forEach((t, k) => make(t.label ?? 'Imagining...', k, active === k))
  }

  function selectTab(index, key) {
    const e = entry(index)
    const version = key === 'original' ? e.original : e.transforms[key]
    if (!version) return
    renderTabs(index, key)
    renderCard(version)
    if (key === 'original' && version.audio?.length) playAudioChain(version.audio)
    else stopAudio()
  }

  return {
    // Seed a passage's canonical card (from the samples manifest).
    setOriginal(index, original) {
      entry(index).original = original
    },
    // Open the viewer on a passage; defaults to its Original tab.
    show(index) {
      currentIndex = index
      const e = entry(index)
      root.classList.remove('hidden')
      if (e.original) selectTab(index, 'original')
      else if (e.transforms.length) selectTab(index, e.transforms.length - 1)
      else {
        renderTabs(index, null)
        card.innerHTML = ''
        stopAudio()
      }
    },
    // A new transform starts (still may arrive later); returns its tab id.
    addTransform(index, transform) {
      const e = entry(index)
      e.transforms.push(transform)
      const id = e.transforms.length - 1
      if (currentIndex === index) selectTab(index, id)
      return id
    },
    // Patch a transform (e.g. the loop arriving) and re-render if visible.
    updateTransform(index, id, patch) {
      const e = entry(index)
      if (!e.transforms[id]) return
      Object.assign(e.transforms[id], patch)
      if (currentIndex === index) {
        const activeBtns = tabs.querySelectorAll('.version-tab')
        const activeIdx = [...activeBtns].findIndex((b) => b.classList.contains('active'))
        const originalOffset = entry(index).original ? 1 : 0
        if (activeIdx - originalOffset === id) selectTab(index, id)
      }
    },
    stopAudio,
  }
}
