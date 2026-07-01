// tests/upload.test.js
import { describe, it, expect, vi } from 'vitest'
import { consumeExperienceStream } from '../src/upload.js'

function ndjsonResponse(events) {
  const text = events.map((e) => JSON.stringify(e)).join('\n') + '\n'
  const bytes = new TextEncoder().encode(text)
  let sent = false
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: async () => {
          if (sent) return { done: true, value: undefined }
          sent = true
          return { done: false, value: bytes }
        },
      }),
    },
  }
}

describe('consumeExperienceStream', () => {
  it('invokes onStatus for status events and resolves with the scene', async () => {
    const events = [
      { type: 'status', stage: 'reading', label: 'Reading the page...' },
      { type: 'scene', scene: { id: 's', title: 't', beats: [] } },
    ]
    const onStatus = vi.fn()
    const scene = await consumeExperienceStream(ndjsonResponse(events), { onStatus })
    expect(onStatus).toHaveBeenCalledWith('Reading the page...')
    expect(scene.id).toBe('s')
  })

  it('rejects when the stream reports an error event', async () => {
    const events = [{ type: 'error', message: 'boom' }]
    await expect(
      consumeExperienceStream(ndjsonResponse(events), { onStatus: vi.fn() }),
    ).rejects.toThrow('boom')
  })

  it('rejects when the stream ends without a scene', async () => {
    const events = [{ type: 'status', stage: 'reading', label: 'Reading...' }]
    await expect(
      consumeExperienceStream(ndjsonResponse(events), { onStatus: vi.fn() }),
    ).rejects.toThrow(/no scene/i)
  })
})
