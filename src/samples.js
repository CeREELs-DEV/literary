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

// Map the manifest's pre-generated versions (Original + era remixes) to their
// flattened beat indexes so the viewer can seed each passage's tabs.
export function versionsByIndex(manifest) {
  const map = new Map()
  let index = 0
  for (const page of manifest.pages) {
    for (const beat of page.beats) {
      const versions = (beat.versions ?? []).map((v) => ({
        label: v.label,
        still: v.still ?? null,
        clip: v.clip ?? null,
        audio: v.audio ?? [],
      }))
      // Older manifests carried a single canonical card per beat.
      if (versions.length === 0 && (beat.still || beat.clip)) {
        versions.push({
          label: 'Original',
          still: beat.still ?? null,
          clip: beat.clip ?? null,
          audio: beat.audio ?? [],
        })
      }
      map.set(index, versions)
      index += 1
    }
  }
  return map
}
