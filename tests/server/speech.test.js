// tests/server/speech.test.js
import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadVoiceConfig, generateBeatSpeech } from '../../server/speech.js'

const scene = {
  id: 's', title: 't',
  beats: [
    {
      text: '"Run!" she whispered.', amplifiedCaption: 'x', duration: 3000, effects: [],
      narration: '"Run!" she whispered.',
      speech: [
        { speaker: 'character-1', text: 'Run!', delivery: 'whisper' },
        { speaker: 'narrator', text: 'she whispered.', delivery: 'normal' },
      ],
    },
  ],
}

const config = {
  apiKey: 'k',
  voices: { narrator: 'voice-n', 'character-1': 'voice-d1', 'character-2': 'voice-d2' },
}

function fakeFetch({ failOn = -1 } = {}) {
  let call = 0
  return vi.fn(async () => {
    const i = call++
    if (i === failOn) return { ok: false, status: 429 }
    return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }
  })
}

describe('loadVoiceConfig', () => {
  it('returns null without key or narration voice', () => {
    expect(loadVoiceConfig({})).toBeNull()
    expect(loadVoiceConfig({ ELEVENLABS_API_KEY: 'k' })).toBeNull()
  })

  it('maps env vars to speaker voices with fallbacks', () => {
    const cfg = loadVoiceConfig({
      ELEVENLABS_API_KEY: 'k',
      NARRATION_VOICE_ID: 'n',
      DIALOGUE_VOICE_ID_1: 'd1',
      DIALOGUE_VOICE_ID_2: 'd2',
    })
    expect(cfg.voices).toEqual({ narrator: 'n', 'character-1': 'd1', 'character-2': 'd2' })
    const partial = loadVoiceConfig({ ELEVENLABS_API_KEY: 'k', NARRATION_VOICE_ID: 'n' })
    expect(partial.voices['character-1']).toBe('n') // falls back to narrator
  })
})

describe('generateBeatSpeech', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'speech-'))

  it('generates one mp3 per segment with the right voice and tag, emits per beat', async () => {
    const fetchImpl = fakeFetch()
    const emit = vi.fn()
    const result = await generateBeatSpeech({ scene, config, emit, saveDir: tmp, fetchImpl })

    expect(fetchImpl).toHaveBeenCalledTimes(2)
    // segment 1: character-1 whisper
    const [url1, opts1] = fetchImpl.mock.calls[0]
    expect(url1).toContain('/text-to-speech/voice-d1')
    const body1 = JSON.parse(opts1.body)
    expect(body1.model_id).toBe('eleven_v3')
    expect(body1.text).toBe('[whispers] Run!')
    expect(opts1.headers['xi-api-key']).toBe('k')
    // segment 2: narrator normal (no tag)
    const body2 = JSON.parse(fetchImpl.mock.calls[1][1].body)
    expect(body2.text).toBe('she whispered.')

    expect(emit).toHaveBeenCalledTimes(1)
    const event = emit.mock.calls[0][0]
    expect(event.type).toBe('speech')
    expect(event.index).toBe(0)
    expect(event.urls).toHaveLength(2)
    expect(event.urls[0]).toMatch(/^\/api\/media\/speech-.+\.mp3$/)
    // files actually written
    for (const u of event.urls) {
      expect(fs.existsSync(path.join(tmp, path.basename(u)))).toBe(true)
    }
    expect(result).toEqual([{ index: 0, urls: event.urls }])
  })

  it('skips a failing beat without throwing and emits nothing for it', async () => {
    const emit = vi.fn()
    const result = await generateBeatSpeech({
      scene, config, emit, saveDir: tmp, fetchImpl: fakeFetch({ failOn: 0 }),
    })
    expect(result).toEqual([])
    expect(emit).not.toHaveBeenCalled()
  })
})
