// tests/remix.test.js
import { describe, it, expect, vi } from 'vitest'
import { requestReimagine } from '../src/remix.js'

describe('requestReimagine', () => {
  it('posts the right body and returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ label: '1800s Joseon Korea', src: 'data:image/jpeg;base64,abc' }),
    }))
    const result = await requestReimagine(
      { text: 'The door slammed shut.', sceneTitle: 'A Windy Day', wish: '조선시대' },
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
    expect(result).toEqual({ label: '1800s Joseon Korea', src: 'data:image/jpeg;base64,abc' })
  })

  it('throws with the server-provided error message on !ok', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: 'reimagine failed' }),
    }))
    await expect(
      requestReimagine({ text: 'x', sceneTitle: 't', wish: 'y' }, fetchImpl),
    ).rejects.toThrow('reimagine failed')
  })
})
