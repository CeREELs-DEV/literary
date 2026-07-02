// tests/upload.test.js
import { describe, it, expect, vi } from 'vitest'
import { consumeExperienceStream } from '../src/upload.js'

function ndjsonResponse(events, { chunkSplit } = {}) {
  const text = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  const bytes = new TextEncoder().encode(text)
  const chunks = chunkSplit
    ? [bytes.slice(0, chunkSplit), bytes.slice(chunkSplit)]
    : [bytes]
  let i = 0
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () =>
          i < chunks.length
            ? { done: false, value: chunks[i++] }
            : { done: true, value: undefined },
      }),
    },
  }
}

const scene = { id: 's', title: 't', beats: [] }

describe('consumeExperienceStream', () => {
  it('dispatches status/scene/image/speech/film callbacks and resolves with a summary', async () => {
    const events = [
      { type: 'status', stage: 'reading', label: 'Reading the page...' },
      { type: 'scene', scene },
      { type: 'image', index: 0, src: 'data:image/png;base64,aW1n' },
      { type: 'speech', index: 0, urls: ['/api/media/speech-1.mp3'] },
      { type: 'film', url: '/api/media/film-1.mp4' },
      { type: 'status', stage: 'done', label: 'Experience complete!' },
    ]
    const handlers = {
      onStatus: vi.fn(), onScene: vi.fn(), onImage: vi.fn(),
      onSpeech: vi.fn(), onFilm: vi.fn(),
    }
    const summary = await consumeExperienceStream(ndjsonResponse(events), handlers)
    expect(handlers.onSpeech).toHaveBeenCalledWith(0, ['/api/media/speech-1.mp3'])
    expect(handlers.onFilm).toHaveBeenCalledWith('/api/media/film-1.mp4')
    expect(summary.speech).toEqual({ 0: ['/api/media/speech-1.mp3'] })
    expect(summary.film).toBe('/api/media/film-1.mp4')
  })

  it('handles an event line split across two chunks', async () => {
    const events = [
      { type: 'scene', scene },
      { type: 'status', stage: 'done', label: 'done' },
    ]
    const summary = await consumeExperienceStream(
      ndjsonResponse(events, { chunkSplit: 10 }),
      { onScene: vi.fn() },
    )
    expect(summary.scene).toEqual(scene)
  })

  it('rejects when the stream reports an error event', async () => {
    await expect(
      consumeExperienceStream(ndjsonResponse([{ type: 'error', message: 'boom' }]), {}),
    ).rejects.toThrow('boom')
  })

  it('rejects when the stream ends without a scene', async () => {
    await expect(
      consumeExperienceStream(
        ndjsonResponse([{ type: 'status', stage: 'reading', label: 'x' }]),
        {},
      ),
    ).rejects.toThrow(/no scene/i)
  })
})
