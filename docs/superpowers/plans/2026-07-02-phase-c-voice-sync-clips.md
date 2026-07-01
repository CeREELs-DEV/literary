# Phase C — ElevenLabs 보이스 + 오디오 싱크 + 비트별 클립 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 피드백 3건을 해결한다 — ① 영상이 짧음 → **비트별 Veo 클립 병렬 생성**, ② 텍스트·TTS 싱크 불일치 → **비트 전환을 내레이션 오디오 종료에 동기화**, ③ whispered 미표현 → **ElevenLabs v3 오디오 태그**(`[whispers]` 등)로 연출된 내레이션/대사 보이스.

**Architecture:** Claude가 비트 설계 시 원문을 화자별 `speech` 세그먼트(narrator/character-1/character-2 + delivery)로 분해한다. 서버는 이미지 생성과 **병렬로** ElevenLabs TTS를 생성해 `/api/media`로 서빙하고 `speech` 이벤트로 스트리밍한다. 타임라인 엔진은 비트에 `audioUrls`가 있으면 고정 duration 대신 **오디오 체인이 끝날 때** 다음 비트로 넘어간다. 클립은 대표 1개 대신 **비트마다** 병렬 생성되어 `clip {index, url}`로 도착하고, 애니메이션 리플레이에서 비트별로 재생된다(부족한 비트는 이미지 폴백).

**Tech Stack:** ElevenLabs TTS REST(`eleven_v3`, 오디오 태그) — SDK 없이 `fetch`. 기존 `@google/genai`(이미지·Veo), Express NDJSON, Vitest.

**Env (이미 설정됨):** `ELEVENLABS_API_KEY`, `NARRATION_VOICE_ID`, `DIALOGUE_VOICE_ID_1`, `DIALOGUE_VOICE_ID_2`.

**API usage notes (구현자 필독):**
- TTS: `POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}` — 헤더 `xi-api-key`, body `{ text, model_id: 'eleven_v3' }`, 응답은 mp3 바이너리. delivery는 텍스트 앞에 오디오 태그로: whisper→`[whispers]`, shout→`[shouting]`, excited→`[excited]`, sad→`[sad]`, normal→태그 없음.
- ElevenLabs는 동시성 제한이 있으므로 **비트를 순차 처리**한다(비트당 세그먼트도 순차). 429/오류 비트는 건너뛰고 계속(해당 비트는 브라우저 TTS 폴백).
- Veo `durationSeconds`는 **숫자** (기존 수정 유지). 호출이 400이면 공식 문서 재확인 후 최소 수정.
- 레퍼런스 이미지가 30장이므로 `loadReferenceImages`에서 **정렬 후 최대 8장**으로 캡(상수로 조정 가능).

---

## File Structure

- `server/scene-schema.js` — beat에 `speech` 배열 추가 + 프롬프트 확장 (수정)
- `server/speech.js` — `loadVoiceConfig`, `generateBeatSpeech` (신규)
- `server/video.js` — `generateBeatClips` 추가 (수정)
- `server/images.js` — 레퍼런스 8장 캡 (수정)
- `server/pipeline.js` — 이미지∥TTS 병렬, 비트별 클립, 기능별 우아한 스킵 (수정)
- `src/timeline/engine.js` — 오디오 싱크 비트 전환 (수정)
- `src/effects/media.js` — `playClip` 루프 재생 (수정)
- `src/upload.js` — `onSpeech`, 인덱스 있는 `onClip` (수정)
- `src/main.js` — speech/clips 수집, 비트별 클립 리플레이 (수정)
- Tests: `tests/server/speech.test.js`(신규), `tests/server/video.test.js`·`pipeline.test.js`·`images.test.js`·`upload.test.js`·`timeline/engine.test.js` (수정)

NDJSON 이벤트 계약(변경분):
```
{ type: 'speech', index: <beatIndex>, urls: ['/api/media/speech-...mp3', ...] }   // 비트별, 완성되는 대로
{ type: 'clip', index: <beatIndex>, url: '/api/media/clip-...mp4' }               // 비트별 (기존: index 없음)
```

---

## Task 1: 씬 스키마 — `speech` 세그먼트 + 프롬프트 확장

**Files:**
- Modify: `server/scene-schema.js`
- Modify: `tests/server/scene-schema.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가** (`scene-schema.test.js`의 describe 안에 append)

```js
  it('defines speech segments with speaker and delivery enums', () => {
    const speech = SCENE_SCHEMA.properties.beats.items.properties.speech
    expect(SCENE_SCHEMA.properties.beats.items.required).toContain('speech')
    expect(speech.items.required).toEqual(['speaker', 'text', 'delivery'])
    expect(speech.items.properties.speaker.enum).toEqual([
      'narrator', 'character-1', 'character-2',
    ])
    expect(speech.items.properties.delivery.enum).toEqual([
      'normal', 'whisper', 'excited', 'shout', 'sad',
    ])
    expect(speech.items.additionalProperties).toBe(false)
  })

  it('prompt instructs dialogue splitting and delivery tagging', () => {
    expect(SYSTEM_PROMPT).toMatch(/speech/)
    expect(SYSTEM_PROMPT).toMatch(/whisper/i)
    expect(SYSTEM_PROMPT).toMatch(/character-1/)
  })
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/server/scene-schema.test.js`
Expected: 신규 2개 FAIL.

- [ ] **Step 3: `SCENE_SCHEMA`의 beat items에 `speech` 추가**

`required` 배열을 `['text', 'amplifiedCaption', 'duration', 'narration', 'effects', 'speech']`로 바꾸고, `properties`에 추가:

```js
          speech: {
            type: 'array',
            description:
              'the beat text split into voice segments, in reading order (1-4 segments)',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['speaker', 'text', 'delivery'],
              properties: {
                speaker: {
                  enum: ['narrator', 'character-1', 'character-2'],
                  description:
                    'narrator for prose; character-1/2 for quoted dialogue, assigned consistently',
                },
                text: { type: 'string', description: 'the exact words to speak' },
                delivery: {
                  enum: ['normal', 'whisper', 'excited', 'shout', 'sad'],
                  description: 'vocal delivery implied by the text',
                },
              },
            },
          },
```

- [ ] **Step 4: `SYSTEM_PROMPT`의 Rules에 다음 항목 추가** (기존 규칙 유지, narration 규칙 아래에 삽입)

```
- beat.speech: split the beat's text into voice segments in reading order.
  Prose and attribution ("she said") go to speaker "narrator". Quoted dialogue goes to
  "character-1" or "character-2" — assign each story character one id and keep it
  consistent across all beats. Strip the surrounding quotes from dialogue text.
- delivery: infer from the text. "...he whispered" -> the dialogue segment gets
  delivery "whisper". Shouting/exclamations -> "shout". Excitement -> "excited".
  Sorrow -> "sad". Otherwise "normal". The narrator is usually "normal" but may
  whisper for tense, quiet moments.
```

- [ ] **Step 5: 전체 스키마 테스트 통과 확인**

Run: `npx vitest run tests/server/scene-schema.test.js`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add server/scene-schema.js tests/server/scene-schema.test.js
git commit -m "feat: add per-beat speech segments with speaker and delivery"
```

---

## Task 2: ElevenLabs TTS (`server/speech.js`)

**Files:**
- Create: `server/speech.js`
- Test: `tests/server/speech.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/server/speech.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/server/speech.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add server/speech.js tests/server/speech.test.js
git commit -m "feat: add ElevenLabs expressive speech generation per beat"
```

---

## Task 3: 비트별 클립 (`generateBeatClips`) + 레퍼런스 캡

**Files:**
- Modify: `server/video.js`
- Modify: `server/images.js`
- Modify: `tests/server/video.test.js`, `tests/server/images.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가** (`tests/server/video.test.js`에 append — 기존 import에 `generateBeatClips` 추가)

```js
describe('generateBeatClips', () => {
  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'A', amplifiedCaption: 'wind', duration: 3000, effects: [] },
      { text: 'B', amplifiedCaption: 'slam', duration: 3000, effects: [] },
    ],
  }
  const images = [
    { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
    { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
  ]

  it('generates one clip per image in parallel and emits indexed clip events', async () => {
    const ai = fakeAi({ polls: 0 })
    const emit = vi.fn()
    const clips = await generateBeatClips({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(clips).toHaveLength(2)
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(2)
    // correct mime passed through from the data URL
    expect(ai.models.generateVideos.mock.calls[0][0].image.mimeType).toBe('image/jpeg')
    const events = emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'clip')
    expect(events.map((e) => e.index).sort()).toEqual([0, 1])
    expect(events[0].url).toMatch(/^\/api\/media\/clip-.+\.mp4$/)
  })

  it('tolerates one failed clip and still returns the rest', async () => {
    const ai = fakeAi({ polls: 0 })
    let call = 0
    const original = ai.models.generateVideos
    ai.models.generateVideos = vi.fn(async (params) => {
      if (call++ === 0) throw new Error('veo down')
      return original(params)
    })
    const emit = vi.fn()
    const clips = await generateBeatClips({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(clips).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 실패 확인 후 `server/video.js`에 추가**

```js
// Animate every beat illustration into its own clip, in parallel.
// Emits an indexed clip event as each finishes; one failure doesn't sink the rest.
export async function generateBeatClips({ scene, images, emit, ai, saveDir, sleep }) {
  const results = await Promise.allSettled(
    images.map(async ({ index, src }) => {
      const url = await generateSceneClip({
        imageBase64: src.slice(src.indexOf(',') + 1),
        mimeType: src.slice(5, src.indexOf(';')),
        prompt:
          `${scene.beats[index].amplifiedCaption}. ` +
          `Cinematic children's storybook animation, gentle camera movement, matching the illustration's art style.`,
        emit: () => {}, // suppress the un-indexed event; we emit an indexed one below
        ai,
        saveDir,
        ...(sleep ? { sleep } : {}),
      })
      emit({ type: 'clip', index, url })
      return { index, url }
    }),
  )
  const failed = results.filter((r) => r.status === 'rejected')
  for (const f of failed) console.error('beat clip failed:', f.reason?.message ?? f.reason)
  return results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
}
```

주의: `Date.now()` 파일명이 병렬로 겹칠 수 있으니 `generateSceneClip`의 filename을 `clip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`로 변경(충돌 방지).

- [ ] **Step 3: 레퍼런스 캡 테스트 추가** (`tests/server/images.test.js`에 append) 후 구현

테스트:
```js
describe('reference cap', () => {
  it('caps references sent to the API at MAX_REFERENCES', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      data: `cmVm${i}`, mimeType: 'image/png',
    }))
    const ai = fakeAi()
    await generateBeatImages({ scene, references: many, emit: vi.fn(), ai })
    const parts = ai.interactions.create.mock.calls[0][0].input.filter((p) => p.type === 'image')
    expect(parts.length).toBeLessThanOrEqual(8)
  })
})
```

구현 (`server/images.js`): 상단에 `const MAX_REFERENCES = 8` 추가, `generateBeatImages`에서 `references.slice(0, MAX_REFERENCES)`로 parts 구성. (`loadReferenceImages`는 전부 로드하되 전송만 캡 — 정렬은 기존 유지.)

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add server/video.js server/images.js tests/server/video.test.js tests/server/images.test.js
git commit -m "feat: per-beat parallel clip generation and reference image cap"
```

---

## Task 4: 파이프라인 재구성 (이미지∥TTS → 비트별 클립)

**Files:**
- Modify: `server/pipeline.js`
- Modify: `tests/server/pipeline.test.js`

새 스테이지 흐름: `reading → designing → drawing(이미지∥TTS) → animating(비트별 클립) → done`. TTS는 `voiceConfig`가 있을 때만, 이미지는 `genAi`+레퍼런스가 있을 때만 — 서로 독립적으로 스킵.

- [ ] **Step 1: 실패하는 테스트 추가** (`tests/server/pipeline.test.js`에 append; `fakeGenAi`는 기존 것 재사용)

```js
describe('runExperiencePipeline — Phase C speech and per-beat clips', () => {
  const base = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' }
  const references = [{ data: 'cmVm', mimeType: 'image/png' }]
  const voiceConfig = {
    apiKey: 'k',
    voices: { narrator: 'n', 'character-1': 'd1', 'character-2': 'd2' },
  }
  const fakeFetch = () =>
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new Uint8Array([1]).buffer }))

  it('emits speech events alongside images during drawing', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references,
      voiceConfig, fetchImpl: fakeFetch(),
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('speech')
    expect(types).toContain('image')
    expect(types).toContain('clip')
    // clip events are indexed now
    const clip = emit.mock.calls.map((c) => c[0]).find((e) => e.type === 'clip')
    expect(clip.index).toBeDefined()
  })

  it('generates speech even when visuals are unavailable', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: null, references: [],
      voiceConfig, fetchImpl: fakeFetch(), saveDir: '/tmp/generated',
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('speech')
    expect(types).not.toContain('image')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('skips speech gracefully without voiceConfig (existing visual path intact)', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), references,
      voiceConfig: null, saveDir: '/tmp/generated', sleep: async () => {},
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).not.toContain('speech')
    expect(types).toContain('image')
  })
})
```

참고: 파이프라인 테스트의 `validScene` 비트에는 `speech` 필드가 없어도 된다(`generateBeatSpeech`가 `beat.speech ?? []`로 방어). 단, fake 씬에 speech를 넣으면 TTS 경로가 실행된다 — `fakeClient`의 validScene 비트에 다음을 추가하라:

```js
speech: [{ speaker: 'narrator', text: 'The door slammed shut.', delivery: 'normal' }],
```

- [ ] **Step 2: `server/pipeline.js` 수정**

임포트 추가/변경:
```js
import { loadVoiceConfig, generateBeatSpeech } from './speech.js'
import { generateSceneClip } from './video.js'  // → generateBeatClips로 교체
```
→ `import { generateBeatClips } from './video.js'`

시그니처에 `voiceConfig = loadVoiceConfig()`, `fetchImpl` 추가. scene emit 이후 부분을 다음으로 교체:

```js
  const canDraw = Boolean(genAi) && references.length > 0
  const canSpeak = Boolean(voiceConfig)

  if (!canDraw && !canSpeak) {
    emit({ type: 'status', stage: 'done', label: 'Experience ready!' })
    return
  }

  emit({ type: 'status', stage: 'drawing', label: 'Illustrating and voicing the scenes...' })
  const [images] = await Promise.all([
    canDraw
      ? generateBeatImages({ scene, references, emit, ai: genAi })
      : Promise.resolve([]),
    canSpeak
      ? generateBeatSpeech({
          scene, config: voiceConfig, emit, saveDir,
          ...(fetchImpl ? { fetchImpl } : {}),
        })
      : Promise.resolve([]),
  ])

  // Frontend starts the image+voice experience on this signal;
  // per-beat clips keep generating in the background.
  emit({ type: 'status', stage: 'animating', label: 'Breathing motion into the scenes...' })

  if (images.length > 0) {
    try {
      await generateBeatClips({
        scene, images, emit, ai: genAi, saveDir,
        ...(sleep ? { sleep } : {}),
      })
    } catch (err) {
      console.error('clip generation failed:', err?.message ?? err)
      emit({ type: 'status', stage: 'animating', label: 'Animation unavailable this time.' })
    }
  }

  emit({ type: 'status', stage: 'done', label: 'Experience complete!' })
```

(`heroBeatIndex` 함수는 더 이상 사용하지 않으므로 삭제.)

- [ ] **Step 3: 기존 Phase B 테스트 조정**

- "runs drawing then animating stages and emits images and clip": clip 이벤트가 이제 `index`를 가진다 — 기존 단언이 이벤트 형태를 고정한다면 완화. 클립 수는 이미지 수와 같아진다(1비트 → 1클립, 변화 없음).
- "still reaches done when clip generation fails": `generateBeatClips`는 내부에서 allSettled로 흡수하므로 이 테스트의 기대(에러 없음, done 도달, clip 0개)는 유지된다 — 통과 확인만.

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add server/pipeline.js tests/server/pipeline.test.js
git commit -m "feat: parallel image+speech stage and per-beat clips in pipeline"
```

---

## Task 5: 엔진 오디오 싱크 + 클립 루프

**Files:**
- Modify: `src/timeline/engine.js`
- Modify: `src/effects/media.js`
- Modify: `tests/timeline/engine.test.js` (테스트 추가)

- [ ] **Step 1: 실패하는 테스트 추가** (`engine.test.js`에 append — 이 describe는 fake timer를 쓰지 않으므로 별도 블록)

```js
describe('createTimelineEngine — audio-synced beats', () => {
  const audioScene = {
    id: 's', title: 't',
    beats: [
      {
        text: 'A', duration: 99999, narration: 'A',
        audioUrls: ['/api/media/a1.mp3', '/api/media/a2.mp3'],
        effects: [],
      },
      { text: 'B', duration: 1, effects: [] },
    ],
  }

  it('advances when the audio chain ends instead of the fixed duration', async () => {
    const apply = vi.fn()
    const played = []
    const playAudio = vi.fn(async (url) => { played.push(url) })
    const engine = createTimelineEngine({ stage: {}, apply, playAudio })
    await engine.play(audioScene)
    expect(played).toEqual(['/api/media/a1.mp3', '/api/media/a2.mp3'])
    // beat B was reached without waiting 99999ms
    expect(apply.mock.calls.some((c) => c[1].type === 'text' && c[1].text === 'B')).toBe(true)
  })

  it('does not trigger browser TTS narrate when audioUrls are present', async () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply, playAudio: async () => {} })
    await engine.play(audioScene)
    const narrateForA = apply.mock.calls.find(
      (c) => c[1].type === 'narrate' && c[1].text === 'A',
    )
    expect(narrateForA).toBeUndefined()
  })
})
```

- [ ] **Step 2: 실패 확인 후 `src/timeline/engine.js` 전체 교체**

```js
// src/timeline/engine.js
import { applyEffect } from '../effects/registry.js'

// Play a pre-generated narration file; resolve when it ends (or fails).
function defaultPlayAudio(url) {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    audio.onended = resolve
    audio.onerror = resolve
    const playing = audio.play?.()
    playing?.catch(() => resolve())
  })
}

export function createTimelineEngine({
  stage,
  apply = applyEffect,
  playAudio = defaultPlayAudio,
} = {}) {
  function play(scene) {
    return new Promise((resolve) => {
      let index = 0
      const next = () => {
        if (index >= scene.beats.length) {
          resolve()
          return
        }
        const beat = scene.beats[index]
        index += 1
        // 1) original text + amplified caption
        apply(stage, { type: 'text', text: beat.text, caption: beat.amplifiedCaption ?? '' })
        // 2) the beat's sensory effects
        for (const effect of beat.effects) {
          apply(stage, effect)
        }
        // 3) narration: pre-generated audio syncs the beat; otherwise browser TTS + timer
        if (beat.audioUrls?.length) {
          beat.audioUrls
            .reduce((chain, url) => chain.then(() => playAudio(url)), Promise.resolve())
            .then(next)
        } else {
          if (beat.narration) {
            apply(stage, { type: 'narrate', text: beat.narration })
          }
          setTimeout(next, beat.duration)
        }
      }
      next()
    })
  }

  return { play }
}
```

(기존 fake-timer 테스트들은 duration 경로를 그대로 쓰므로 통과 유지되어야 한다. 만약 기존 구현이 이 형태와 크게 다르면 — 공개 동작을 보존하며 audioUrls 분기만 추가하는 최소 수정을 우선하라.)

- [ ] **Step 3: `src/effects/media.js`의 `playClip`에서 루프 활성화**

`video.loop = false` → `video.loop = true` (8초 클립이 오디오 길이보다 짧은 비트를 커버).

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/timeline/engine.js src/effects/media.js tests/timeline/engine.test.js
git commit -m "feat: audio-synced beat advancement and looping clips"
```

---

## Task 6: 프런트 — speech/클립 수집 + 비트별 리플레이

**Files:**
- Modify: `src/upload.js`
- Modify: `tests/upload.test.js`
- Modify: `src/main.js`

- [ ] **Step 1: `tests/upload.test.js`의 첫 테스트를 다음으로 교체하고 실패 확인**

```js
  it('dispatches status/scene/image/speech/clip callbacks and resolves with a summary', async () => {
    const events = [
      { type: 'status', stage: 'reading', label: 'Reading the page...' },
      { type: 'scene', scene },
      { type: 'image', index: 0, src: 'data:image/png;base64,aW1n' },
      { type: 'speech', index: 0, urls: ['/api/media/speech-1.mp3'] },
      { type: 'clip', index: 0, url: '/api/media/clip-1.mp4' },
      { type: 'status', stage: 'done', label: 'Experience complete!' },
    ]
    const handlers = {
      onStatus: vi.fn(), onScene: vi.fn(), onImage: vi.fn(),
      onSpeech: vi.fn(), onClip: vi.fn(),
    }
    const summary = await consumeExperienceStream(ndjsonResponse(events), handlers)
    expect(handlers.onSpeech).toHaveBeenCalledWith(0, ['/api/media/speech-1.mp3'])
    expect(handlers.onClip).toHaveBeenCalledWith(0, '/api/media/clip-1.mp4')
    expect(summary.speech).toEqual({ 0: ['/api/media/speech-1.mp3'] })
    expect(summary.clips).toEqual({ 0: '/api/media/clip-1.mp4' })
  })
```

- [ ] **Step 2: `src/upload.js` 핸들러 확장**

- 시그니처: `{ onStatus, onScene, onImage, onSpeech = () => {}, onClip = () => {} }`
- summary: `{ scene: null, images: {}, speech: {}, clips: {} }`
- 이벤트 분기 추가:
```js
    } else if (event.type === 'speech') {
      summary.speech[event.index] = event.urls
      onSpeech(event.index, event.urls)
    } else if (event.type === 'clip') {
      summary.clips[event.index] = event.url
      onClip(event.index, event.url)
    }
```
(기존 `clipUrl` 단일 필드는 제거 — `clips` 맵으로 대체.)

- [ ] **Step 3: `src/main.js` 업데이트**

`playScene`을 다음으로 교체:

```js
// Play a scene with per-beat media: images/clips become backgrounds, speech syncs beats.
async function playScene(
  rawScene,
  { images = {}, speech = {}, clips = {}, useClips = false, withBgm = false } = {},
) {
  const scene = validateScene(rawScene)
  showExperienceScreen()
  if (withBgm) startBgm()

  const beats = scene.beats.map((beat, i) => {
    const media = []
    if (useClips && clips[i]) {
      media.push({ type: 'clip', src: clips[i] }, { type: 'image', src: '' })
    } else if (images[i]) {
      media.push({ type: 'image', src: images[i] }, { type: 'clip', src: '' })
    }
    const audioUrls = speech[i]
    return { ...beat, effects: [...media, ...beat.effects], ...(audioUrls ? { audioUrls } : {}) }
  })

  const engine = createTimelineEngine({ stage })
  try {
    await engine.play({ ...scene, beats })
  } finally {
    stopBgm()
  }
}
```

업로드 핸들러의 수집/재생 부분 교체:

```js
  let scene = null
  const images = {}
  const speech = {}
  const clips = {}
  let playbackStarted = false

  const startPlayback = () => {
    if (playbackStarted || !scene) return
    playbackStarted = true
    uploadStatus.textContent = ''
    playScene(scene, { images, speech, withBgm: true }).catch((err) => {
      uploadStatus.textContent = err.message
    })
  }

  const showReplay = () => {
    replayBtn.classList.remove('hidden')
    replayBtn.onclick = () => {
      replayBtn.classList.add('hidden')
      playScene(scene, { images, speech, clips, useClips: true, withBgm: true }).catch(
        (err) => console.error(err),
      )
    }
  }
```

콜백: `onSpeech: (i, urls) => { speech[i] = urls }`, `onClip: (i, url) => { clips[i] = url; showReplay() }` (첫 클립부터 버튼 노출 — 리플레이 시점에 도착한 클립을 쓰고 나머지는 이미지 폴백). `applyEffect` import는 더 이상 필요 없으면 정리.

- [ ] **Step 4: 전체 테스트 + 문법 확인**

Run: `npm run test && node --check src/main.js`
Expected: 전부 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/upload.js tests/upload.test.js src/main.js
git commit -m "feat: per-beat speech and clip playback with voice-synced beats"
```

---

## Task 7: E2E 수동 검증 (실 API)

- [ ] **Step 1: 전체 테스트 + 서버 부팅 확인** (`npm run test`, health check)
- [ ] **Step 2: 풀 파이프라인 실행** — 책 사진 업로드 후 확인:
  1. 일러스트 썸네일 + (병렬) TTS 생성
  2. 체험 시작 시 **비트가 목소리 길이에 맞춰 전환** (텍스트·음성 싱크)
  3. whisper 대사가 실제로 속삭임으로 들림, 내레이션/대사 목소리 구분
  4. 클립 도착 후 리플레이 → **비트마다 자기 클립** 재생(루프), 오디오와 동행
  5. 콘솔/서버 에러 없음
- [ ] **Step 3: 폴백 확인** — TTS 실패 비트가 있으면 해당 비트만 브라우저 TTS + 고정 duration으로 재생되는지.

---

## 완료 기준 (Definition of Done)
- `npm run test` 전부 통과 (~50 tests).
- 텍스트·음성·(클립) 싱크: 비트 전환 = 내레이션 종료.
- whisper/shout 등 delivery가 실제 음성 연출로 들림; 내레이션과 대사가 다른 목소리.
- 애니메이션 리플레이에서 비트별 클립(루프) 재생, 미완성 비트는 이미지 폴백.
- 키가 하나라도 없으면 해당 기능만 스킵 (Phase A/B 동작 보존).
