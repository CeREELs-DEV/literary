// tests/remix.test.js
import { describe, it, expect, vi } from 'vitest'
import { requestReimagine } from '../src/remix.js'

function ndjsonResponse(events) {
  const text = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  const bytes = new TextEncoder().encode(text)
  let sent = false
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          sent
            ? { done: true, value: undefined }
            : ((sent = true), { done: false, value: bytes }),
      }),
    },
  }
}

describe('requestReimagine', () => {
  it('posts the body, dispatches image/clip callbacks, and resolves with a summary', async () => {
    const events = [
      { type: 'image', label: '1800s Joseon Korea', src: 'data:image/jpeg;base64,abc' },
      { type: 'clip', url: '/api/media/remix-1.mp4' },
    ]
    const fetchImpl = vi.fn(async () => ndjsonResponse(events))
    const onImage = vi.fn()
    const onClip = vi.fn()
    const summary = await requestReimagine(
      { text: 'The door slammed shut.', sceneTitle: 'A Windy Day', wish: '조선시대' },
      { onImage, onClip },
      fetchImpl,
    )
    expect(fetchImpl).toHaveBeenCalledWith('/api/reimagine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'The door slammed shut.',
        sceneTitle: 'A Windy Day',
        wish: '조선시대',
      }),
    })
    expect(onImage).toHaveBeenCalledWith('1800s Joseon Korea', 'data:image/jpeg;base64,abc')
    expect(onClip).toHaveBeenCalledWith('/api/media/remix-1.mp4')
    expect(summary).toEqual({
      label: '1800s Joseon Korea',
      src: 'data:image/jpeg;base64,abc',
      clipUrl: '/api/media/remix-1.mp4',
    })
  })

  it('resolves without a clip when the stream only carries the still', async () => {
    const events = [{ type: 'image', label: 'Medieval Europe', src: 'data:image/png;base64,x' }]
    const summary = await requestReimagine(
      { text: 'x', sceneTitle: 't', wish: 'y' },
      {},
      vi.fn(async () => ndjsonResponse(events)),
    )
    expect(summary.clipUrl).toBeNull()
  })

  it('rejects on an in-band error event', async () => {
    const events = [{ type: 'error', message: 'reimagine failed' }]
    await expect(
      requestReimagine({ text: 'x', sceneTitle: 't', wish: 'y' }, {}, vi.fn(async () => ndjsonResponse(events))),
    ).rejects.toThrow('reimagine failed')
  })

  it('throws with the server-provided error message on !ok', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'reimagine failed' }),
    }))
    await expect(
      requestReimagine({ text: 'x', sceneTitle: 't', wish: 'y' }, {}, fetchImpl),
    ).rejects.toThrow('reimagine failed')
  })
})
