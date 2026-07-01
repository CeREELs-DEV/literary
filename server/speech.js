// server/speech.js
import fs from 'node:fs'
import path from 'node:path'

const TAG_BY_DELIVERY = {
  normal: '',
  whisper: '[whispers]',
  excited: '[excited]',
  shout: '[shouting]',
  sad: '[sad]',
}

// Build the voice configuration from env. Null when TTS is unavailable.
export function loadVoiceConfig(env = process.env) {
  const key = env.ELEVENLABS_API_KEY
  const narrator = env.NARRATION_VOICE_ID
  if (!key || !narrator) return null
  return {
    apiKey: key,
    voices: {
      narrator,
      'character-1': env.DIALOGUE_VOICE_ID_1 ?? narrator,
      'character-2': env.DIALOGUE_VOICE_ID_2 ?? env.DIALOGUE_VOICE_ID_1 ?? narrator,
    },
  }
}

// Generate expressive narration/dialogue audio per beat (ElevenLabs v3 audio tags).
// Beats are processed sequentially to respect API concurrency limits; a failing
// beat is skipped (the frontend falls back to browser TTS for it).
export async function generateBeatSpeech({ scene, config, emit, saveDir, fetchImpl = fetch }) {
  const results = []
  for (const [index, beat] of scene.beats.entries()) {
    try {
      const urls = []
      for (const [segIdx, seg] of (beat.speech ?? []).entries()) {
        const voiceId = config.voices[seg.speaker] ?? config.voices.narrator
        const tag = TAG_BY_DELIVERY[seg.delivery] ?? ''
        const res = await fetchImpl(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: 'POST',
            headers: { 'xi-api-key': config.apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `${tag} ${seg.text}`.trim(),
              model_id: 'eleven_v3',
            }),
          },
        )
        if (!res.ok) throw new Error(`TTS failed (${res.status}) for beat ${index}`)
        const buf = Buffer.from(await res.arrayBuffer())
        const filename = `speech-${Date.now()}-${index}-${segIdx}.mp3`
        fs.writeFileSync(path.join(saveDir, filename), buf)
        urls.push(`/api/media/${filename}`)
      }
      if (urls.length) {
        emit({ type: 'speech', index, urls })
        results.push({ index, urls })
      }
    } catch (err) {
      console.error('speech generation failed:', err?.message ?? err)
    }
  }
  return results
}
