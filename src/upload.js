// src/upload.js

// Read an NDJSON experience stream, dispatching callbacks as artifacts arrive.
// Resolves with { scene, images, speech, film } when the stream ends.
export async function consumeExperienceStream(
  response,
  {
    onStatus = () => {},
    onScene = () => {},
    onImage = () => {},
    onSpeech = () => {},
    onFilm = () => {},
  } = {},
) {
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status ?? 'network error'})`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const summary = { scene: null, images: {}, speech: {}, film: null }

  const handleLine = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'status') onStatus(event.label, event.stage)
    else if (event.type === 'scene') {
      summary.scene = event.scene
      onScene(event.scene)
    } else if (event.type === 'image') {
      summary.images[event.index] = event.src
      onImage(event.index, event.src)
    } else if (event.type === 'speech') {
      summary.speech[event.index] = event.urls
      onSpeech(event.index, event.urls)
    } else if (event.type === 'film') {
      summary.film = { url: event.url, index: event.index }
      onFilm(event.url, event.index)
    } else if (event.type === 'error') throw new Error(event.message)
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

  if (!summary.scene) throw new Error('Stream ended with no scene.')
  return summary
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

// Full upload flow: POST the photo, dispatch artifact callbacks, resolve at stream end.
export async function requestExperience(file, handlers) {
  const payload = await fileToBase64(file)
  const response = await fetch('/api/experience', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return consumeExperienceStream(response, handlers)
}
