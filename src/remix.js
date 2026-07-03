// src/remix.js

// POST a passage + wish; the server streams NDJSON. Sample-book passages
// (with staging) stream a design label then the finished clip; upload-flow
// passages stream a still image first, then the loop. Resolves with a summary
// at stream end; rejects on HTTP failure or an in-band error event.
export async function requestReimagine(
  { text, sceneTitle, wish, bookText = '', staging = null },
  { onDesign = () => {}, onImage = () => {}, onClip = () => {} } = {},
  fetchImpl = fetch,
) {
  const response = await fetchImpl('/api/reimagine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sceneTitle, wish, bookText, staging }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error ?? `Reimagine failed (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const summary = { label: null, src: null, clipUrl: null }

  const handleLine = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'design') {
      summary.label = event.label
      onDesign(event.label)
    } else if (event.type === 'image') {
      summary.label = event.label
      summary.src = event.src
      onImage(event.label, event.src)
    } else if (event.type === 'clip') {
      summary.clipUrl = event.url
      onClip(event.url)
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

  if (!summary.src && !summary.clipUrl) throw new Error('Stream ended with nothing generated.')
  return summary
}
