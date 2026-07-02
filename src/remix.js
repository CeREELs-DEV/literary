// src/remix.js
export async function requestReimagine({ text, sceneTitle, wish }, fetchImpl = fetch) {
  const response = await fetchImpl('/api/reimagine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sceneTitle, wish }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body?.error ?? `Reimagine failed (${response.status})`)
  }
  return response.json()
}
