// src/viewer.js

// Per-passage viewer: click a highlighted sentence and see THAT scene —
// its pre-generated versions (Original + era remixes) plus any transforms
// the child has made live, switchable as tabs. One passage, many worlds.
export function createPassageViewer(
  { root, tabs, card },
  { audioFactory = (url) => new Audio(url) } = {},
) {
  const state = new Map() // beat index -> { presets: [], transforms: [] }
  let currentIndex = null
  let currentKey = null
  let currentAudio = null

  function entry(index) {
    if (!state.has(index)) state.set(index, { presets: [], transforms: [] })
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
    } else if (!version.clip) {
      frame.classList.add('pending')
    }
    if (version.clip) {
      const video = document.createElement('video')
      video.src = version.clip
      // The clips carry their own ambience (Omni Flash); keep it under the
      // voices and bgm. Transform clips (Veo) are silent, so this is safe.
      video.muted = false
      video.volume = 0.35
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
    const make = (label, key) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `version-tab${key === active ? ' active' : ''}`
      btn.textContent = label
      btn.addEventListener('click', () => selectTab(index, key))
      tabs.appendChild(btn)
    }
    e.presets.forEach((v, i) => make(v.label ?? 'Original', `preset:${i}`))
    e.transforms.forEach((t, k) => make(t.label ?? 'Imagining...', `transform:${k}`))
  }

  function versionFor(index, key) {
    const e = entry(index)
    const [kind, i] = key.split(':')
    return kind === 'preset' ? e.presets[Number(i)] : e.transforms[Number(i)]
  }

  function selectTab(index, key) {
    const version = versionFor(index, key)
    if (!version) return
    currentKey = key
    renderTabs(index, key)
    // Render and voice together so the reading starts with the clip's frame 0.
    renderCard(version)
    if (key.startsWith('preset') && version.audio?.length) playAudioChain(version.audio)
    else stopAudio()
  }

  return {
    // Seed a passage's pre-generated versions (from the samples manifest).
    setVersions(index, versions) {
      entry(index).presets = versions ?? []
    },
    // Open the viewer on a passage; defaults to its first (Original) tab.
    show(index) {
      currentIndex = index
      const e = entry(index)
      root.classList.remove('hidden')
      if (e.presets.length) selectTab(index, 'preset:0')
      else if (e.transforms.length) selectTab(index, `transform:${e.transforms.length - 1}`)
      else {
        currentKey = null
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
      if (currentIndex === index) selectTab(index, `transform:${id}`)
      return id
    },
    // Patch a transform (e.g. the loop arriving) and re-render if visible.
    updateTransform(index, id, patch) {
      const e = entry(index)
      if (!e.transforms[id]) return
      Object.assign(e.transforms[id], patch)
      if (currentIndex === index && currentKey === `transform:${id}`) {
        selectTab(index, currentKey)
      }
    },
    stopAudio,
  }
}
