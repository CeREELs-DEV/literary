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

// Map the manifest's canonical cards to their flattened beat indexes so the
// per-passage viewer can seed each passage's Original tab.
export function originalsByIndex(manifest) {
  const map = new Map()
  let index = 0
  for (const page of manifest.pages) {
    for (const beat of page.beats) {
      map.set(index, {
        label: 'Original',
        still: beat.still,
        clip: beat.clip,
        audio: beat.audio ?? [],
        text: beat.text,
      })
      index += 1
    }
  }
  return map
}
