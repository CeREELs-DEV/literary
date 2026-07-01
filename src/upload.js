// Read an NDJSON experience stream; call onStatus per status event,
// resolve with the scene, reject on error events or missing scene.
export async function consumeExperienceStream(response, { onStatus }) {
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status ?? 'network error'})`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let scene = null

  const handleLine = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'status') onStatus(event.label)
    else if (event.type === 'scene') scene = event.scene
    else if (event.type === 'error') throw new Error(event.message)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 1)
    }
  }
  if (buffer.trim()) handleLine(buffer)

  if (!scene) throw new Error('Stream ended with no scene.')
  return scene
}

// Convert a File to { imageBase64, mediaType } for the API.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      resolve({ imageBase64: base64, mediaType: file.type })
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

// Full upload flow: POST the photo, stream progress, return the scene.
export async function requestExperience(file, { onStatus }) {
  const payload = await fileToBase64(file)
  const response = await fetch('/api/experience', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return consumeExperienceStream(response, { onStatus })
}
