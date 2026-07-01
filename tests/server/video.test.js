// tests/server/video.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateSceneClip } from '../../server/video.js'

function fakeAi({ polls = 2 } = {}) {
  let remaining = polls
  const finished = {
    done: true,
    response: { generatedVideos: [{ video: { name: 'files/abc' } }] },
  }
  return {
    models: {
      generateVideos: vi.fn(async () =>
        remaining === 0 ? finished : { done: false },
      ),
    },
    operations: {
      getVideosOperation: vi.fn(async () => {
        remaining -= 1
        return remaining <= 0 ? finished : { done: false }
      }),
    },
    files: {
      download: vi.fn(async () => {}),
    },
  }
}

describe('generateSceneClip', () => {
  it('polls until done, downloads, and emits a media URL', async () => {
    const ai = fakeAi({ polls: 2 })
    const emit = vi.fn()
    const sleep = vi.fn(async () => {})
    const url = await generateSceneClip({
      imageBase64: 'aW1n',
      prompt: 'door slams',
      emit,
      ai,
      saveDir: '/tmp/generated',
      sleep,
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalled()
    expect(ai.files.download).toHaveBeenCalledOnce()
    const { downloadPath } = ai.files.download.mock.calls[0][0]
    expect(downloadPath.startsWith('/tmp/generated/')).toBe(true)
    expect(url).toMatch(/^\/api\/media\/clip-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'clip', url })
  })

  it('sends the hero image and fast model with audio-capable config', async () => {
    const ai = fakeAi({ polls: 0 })
    await generateSceneClip({
      imageBase64: 'aW1n',
      prompt: 'door slams',
      emit: vi.fn(),
      ai,
      saveDir: '/tmp/generated',
      sleep: async () => {},
    })
    const params = ai.models.generateVideos.mock.calls[0][0]
    expect(params.model).toBe('veo-3.1-fast-generate-preview')
    expect(params.image).toEqual({ imageBytes: 'aW1n', mimeType: 'image/png' })
    expect(params.config).toEqual({
      durationSeconds: 8, // number — the API rejects string values
      resolution: '720p',
      aspectRatio: '16:9',
    })
  })
})
