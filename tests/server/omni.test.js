// tests/server/omni.test.js
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateOmniClip, OMNI_MODEL } from '../../server/omni.js'

const MP4_BASE64 = Buffer.from('fake-mp4-bytes').toString('base64')

function fakeAi({ pollsBeforeDone = 0, status = 'completed', video = { data: MP4_BASE64 } } = {}) {
  let polls = 0
  const finished = { id: 'int-1', status, output_video: video }
  return {
    interactions: {
      create: vi.fn(async () =>
        pollsBeforeDone > 0 ? { id: 'int-1', status: 'in_progress' } : finished,
      ),
      get: vi.fn(async () => {
        polls += 1
        return polls >= pollsBeforeDone ? finished : { id: 'int-1', status: 'in_progress' }
      }),
    },
  }
}

let saveDir

beforeEach(() => {
  saveDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-test-'))
})

afterEach(() => {
  fs.rmSync(saveDir, { recursive: true, force: true })
})

const base = {
  prompt: 'STYLE ... 8-second video of the clean lunch table',
  references: [{ data: 'cmVmMQ==', mimeType: 'image/png' }],
  basename: 'clip-original-0',
  sleep: async () => {},
}

describe('generateOmniClip', () => {
  it('sends the prompt + reference images as a background video interaction', async () => {
    const ai = fakeAi()
    await generateOmniClip({ ...base, ai, saveDir })
    const params = ai.interactions.create.mock.calls[0][0]
    expect(params.model).toBe(OMNI_MODEL)
    expect(params.background).toBe(true)
    expect(params.input[0]).toEqual({ type: 'text', text: base.prompt })
    expect(params.input[1]).toEqual({ type: 'image', mime_type: 'image/png', data: 'cmVmMQ==' })
    expect(params.response_format).toMatchObject({
      type: 'video',
      aspect_ratio: '16:9',
      duration: '8s',
      delivery: 'inline',
    })
  })

  it('polls until the interaction completes, then saves the mp4', async () => {
    const ai = fakeAi({ pollsBeforeDone: 2 })
    const filename = await generateOmniClip({ ...base, ai, saveDir })
    expect(ai.interactions.get).toHaveBeenCalledTimes(2)
    expect(filename).toBe('clip-original-0.mp4')
    expect(fs.readFileSync(path.join(saveDir, filename), 'utf8')).toBe('fake-mp4-bytes')
  })

  it('downloads from the uri when the video is not inline', async () => {
    const ai = fakeAi({ video: { uri: 'https://files.example/v1' } })
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new TextEncoder().encode('uri-mp4').buffer,
    }))
    const filename = await generateOmniClip({ ...base, ai, saveDir, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith('https://files.example/v1')
    expect(fs.readFileSync(path.join(saveDir, filename), 'utf8')).toBe('uri-mp4')
  })

  it('surfaces a failed interaction with its status', async () => {
    const ai = fakeAi({ status: 'failed', video: null })
    await expect(generateOmniClip({ ...base, ai, saveDir })).rejects.toThrow(/failed/)
  })

  it('throws when the completed interaction has no video', async () => {
    const ai = fakeAi({ video: null })
    await expect(generateOmniClip({ ...base, ai, saveDir })).rejects.toThrow(/no video/)
  })

  it('throws when video generation is unavailable (ai is null)', async () => {
    await expect(generateOmniClip({ ...base, ai: null, saveDir })).rejects.toThrow(/unavailable/i)
  })
})
