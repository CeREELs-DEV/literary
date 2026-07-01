# Phase B — 그림체 이미지 + Veo 영상 + 배경음악 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 업로드 파이프라인에 시각 생성을 추가한다 — 레퍼런스 그림체로 비트별 일러스트 생성(Nano Banana 2 Lite), 대표 장면의 움직이는 클립 생성(Veo 3.1 Fast, 오디오 포함), 자체 mp3 배경음악. 산출물은 만들어지는 즉시 화면에 공개되고, 이미지가 완성되면 체험이 바로 시작되며, 영상은 완성 시 "애니메이션 버전" 버튼으로 교체 재생된다.

**Architecture:** 기존 NDJSON 스트림에 이벤트를 추가한다: `scene` 뒤에 `image`(비트별, 완성되는 대로) → `clip`(Veo 완료 시) → `status(done)`. 프런트는 이벤트 콜백 기반으로 전환해 **스트림이 끝나기 전에** 이미지 기반 체험을 시작하고, 클립은 도착하면 리플레이 버튼으로 노출한다. Gemini 키/레퍼런스 이미지가 없으면 시각 단계는 우아하게 건너뛰어 Phase A 동작이 보존된다.

**Tech Stack:** `@google/genai` — Nano Banana 2 Lite(`gemini-3.1-flash-lite-image`, interactions API) + Veo 3.1 Fast(`veo-3.1-fast-generate-preview`, `generateVideos` 롱러닝 오퍼레이션). 기존 Express/NDJSON/Vitest 구조 유지.

**API usage notes (구현자 필독, 2026-07 문서 기준):**
- 이미지: `ai.interactions.create({ model: 'gemini-3.1-flash-lite-image', input: [textPart, imagePart], response_format: { type: 'image', aspect_ratio: '16:9' } })` → `interaction.output_image.data` (base64). Lite는 1K 해상도 고정 — `image_size` 넣지 말 것. 레퍼런스 이미지는 input 배열에 `{ type: 'image', mime_type, data }`로 동봉.
- 영상: `ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, image: { imageBytes, mimeType }, config: { durationSeconds: '8', resolution: '720p', aspectRatio: '16:9' } })` → `operation.done`까지 `ai.operations.getVideosOperation({ operation })` 폴링(10초 간격) → `ai.files.download({ file, downloadPath })`. **오디오는 네이티브 생성됨** (설정 불필요). 소요 11초~6분.
- 클라이언트: `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`.
- 이 API 표면은 최신(2026-06 출시)이라 드리프트 가능 — 호출이 400/404이면 공식 문서(`ai.google.dev/gemini-api/docs/interactions/image-generation`, `.../docs/veo`)를 WebFetch로 재확인 후 최소 수정.

---

## File Structure

- `server/images.js` — 레퍼런스 로드 + 비트별 이미지 생성(`loadReferenceImage`, `generateBeatImages`)
- `server/video.js` — Veo 클립 생성·폴링·다운로드(`generateSceneClip`)
- `server/pipeline.js` — 시각 단계 통합 + 우아한 스킵 (수정)
- `server/paths.js` — 생성물 디렉터리 경로 공용 모듈 (순환 import 방지)
- `server/app.js` — `/api/media` 정적 라우트 (수정)
- `server/style-reference.png` — 사용자 제공 그림체 레퍼런스 (에셋 슬롯)
- `public/audio/bgm.mp3` — 사용자 제공 배경음악 (에셋 슬롯)
- `src/upload.js` — 콜백 기반 스트림 소비로 전환 (수정)
- `src/main.js` — 산출물 공개 UI + 이미지 체험 + 클립 리플레이 (수정)
- `index.html`, `src/styles.css` — 아티팩트 스트립 + 리플레이 버튼 (수정)
- `.env.example`, `.gitignore`, `package.json` (수정)
- Tests: `tests/server/images.test.js`, `tests/server/video.test.js`, `tests/server/pipeline.test.js`(확장), `tests/upload.test.js`(개편)

NDJSON 이벤트 계약(추가분):
```
{ type: 'image', index: <beatIndex>, src: 'data:image/png;base64,...' }   // 완성되는 대로, 순서 무관
{ type: 'clip', url: '/api/media/clip-<ts>.mp4' }
{ type: 'status', stage: 'drawing' | 'animating' | 'done', label: '...' }
```

---

## Task 1: 의존성 + 환경 + 미디어 정적 라우트

**Files:**
- Modify: `package.json` (의존성만 — `npm install`이 처리)
- Modify: `.env.example`
- Modify: `.gitignore`
- Modify: `server/app.js`

- [ ] **Step 1: 의존성 설치**

Run: `npm install @google/genai`
Expected: `dependencies`에 추가됨.

- [ ] **Step 2: `.env.example`의 Phase B 블록을 다음으로 교체**

```
# Phase B — image (Nano Banana 2 Lite) + video (Veo 3.1) generation
GEMINI_API_KEY=...

# Optional quality upgrades (not used yet)
# ELEVENLABS_API_KEY=...
```

- [ ] **Step 3: `.gitignore`에 생성물 디렉터리 추가**

```
server/generated/
```

- [ ] **Step 4: `server/paths.js` 생성** (app.js ↔ pipeline.js 순환 import 방지용 공용 모듈)

```js
// server/paths.js
import path from 'node:path'

export const GENERATED_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  'generated',
)
```

- [ ] **Step 5: `server/app.js`에 미디어 정적 라우트 추가**

`import express from 'express'` 아래에 추가:

```js
import fs from 'node:fs'
import { GENERATED_DIR } from './paths.js'
```

`createApp` 안, `app.use(express.json(...))` 다음 줄에 추가:

```js
  fs.mkdirSync(GENERATED_DIR, { recursive: true })
  app.use('/api/media', express.static(GENERATED_DIR))
```

- [ ] **Step 6: 회귀 확인**

Run: `npm run test`
Expected: 기존 30개 전부 PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example .gitignore server/app.js server/paths.js
git commit -m "feat: add @google/genai, media static route, env slots for Phase B"
```

---

## Task 2: 비트 일러스트 생성 (`server/images.js`)

**Files:**
- Create: `server/images.js`
- Test: `tests/server/images.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/server/images.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateBeatImages } from '../../server/images.js'

const scene = {
  id: 's', title: 't',
  beats: [
    { text: 'A', amplifiedCaption: 'wind howled', duration: 3000, effects: [] },
    { text: 'B', amplifiedCaption: 'door slammed', duration: 3000, effects: [] },
  ],
}
const reference = { data: 'cmVm', mimeType: 'image/png' }

function fakeAi({ failIndex = -1 } = {}) {
  let call = 0
  return {
    interactions: {
      create: vi.fn(async () => {
        const i = call++
        if (i === failIndex) throw new Error('gen failed')
        return { output_image: { data: `aW1nJHtpfQ==` } }
      }),
    },
  }
}

describe('generateBeatImages', () => {
  it('emits one image event per beat with data URLs and returns them', async () => {
    const emit = vi.fn()
    const ai = fakeAi()
    const images = await generateBeatImages({ scene, reference, emit, ai })
    expect(images).toHaveLength(2)
    const events = emit.mock.calls.map((c) => c[0])
    expect(events.every((e) => e.type === 'image')).toBe(true)
    expect(events.map((e) => e.index).sort()).toEqual([0, 1])
    expect(events[0].src).toMatch(/^data:image\/png;base64,/)
  })

  it('sends the reference image and lite model to the API', async () => {
    const ai = fakeAi()
    await generateBeatImages({ scene, reference, emit: vi.fn(), ai })
    const params = ai.interactions.create.mock.calls[0][0]
    expect(params.model).toBe('gemini-3.1-flash-lite-image')
    const imagePart = params.input.find((p) => p.type === 'image')
    expect(imagePart).toEqual({ type: 'image', mime_type: 'image/png', data: 'cmVm' })
    expect(params.response_format).toEqual({ type: 'image', aspect_ratio: '16:9' })
  })

  it('tolerates a single failure and still returns the others', async () => {
    const emit = vi.fn()
    const images = await generateBeatImages({ scene, reference, emit, ai: fakeAi({ failIndex: 0 }) })
    expect(images).toHaveLength(1)
    expect(emit.mock.calls.filter((c) => c[0].type === 'image')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server/images.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
// server/images.js
import fs from 'node:fs'
import path from 'node:path'

const REFERENCE_CANDIDATES = [
  ['style-reference.png', 'image/png'],
  ['style-reference.jpg', 'image/jpeg'],
  ['style-reference.jpeg', 'image/jpeg'],
]

// Load the user-provided art-style reference image, or null if absent.
export function loadReferenceImage(
  dir = path.dirname(new URL(import.meta.url).pathname),
) {
  for (const [name, mimeType] of REFERENCE_CANDIDATES) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) {
      return { data: fs.readFileSync(p).toString('base64'), mimeType }
    }
  }
  return null
}

function beatPrompt(scene, beat) {
  return (
    `Illustrate this moment from a children's story titled "${scene.title}", ` +
    `matching EXACTLY the art style, palette, and linework of the attached reference image: ` +
    `${beat.amplifiedCaption}. Wide cinematic composition. No text or letters in the image.`
  )
}

// Generate one illustration per beat (Nano Banana 2 Lite), emitting each as it completes.
export async function generateBeatImages({ scene, reference, emit, ai }) {
  const results = await Promise.allSettled(
    scene.beats.map(async (beat, index) => {
      const interaction = await ai.interactions.create({
        model: 'gemini-3.1-flash-lite-image',
        input: [
          { type: 'text', text: beatPrompt(scene, beat) },
          { type: 'image', mime_type: reference.mimeType, data: reference.data },
        ],
        response_format: { type: 'image', aspect_ratio: '16:9' },
      })
      const src = `data:image/png;base64,${interaction.output_image.data}`
      emit({ type: 'image', index, src })
      return { index, src }
    }),
  )
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/server/images.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add server/images.js tests/server/images.test.js
git commit -m "feat: add per-beat illustration generation (Nano Banana 2 Lite)"
```

---

## Task 3: Veo 클립 생성 (`server/video.js`)

**Files:**
- Create: `server/video.js`
- Test: `tests/server/video.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
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
      durationSeconds: '8',
      resolution: '720p',
      aspectRatio: '16:9',
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server/video.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
// server/video.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

// Animate the hero illustration into a short clip (Veo 3.1 Fast, native audio).
// Downloads the mp4 into saveDir and emits its /api/media URL.
export async function generateSceneClip({
  imageBase64,
  mimeType = 'image/png',
  prompt,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt,
    image: { imageBytes: imageBase64, mimeType },
    config: { durationSeconds: '8', resolution: '720p', aspectRatio: '16:9' },
  })

  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }

  const filename = `clip-${Date.now()}.mp4`
  const downloadPath = path.join(saveDir, filename)
  await ai.files.download({
    file: operation.response.generatedVideos[0].video,
    downloadPath,
  })

  const url = `/api/media/${filename}`
  emit({ type: 'clip', url })
  return url
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/server/video.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add server/video.js tests/server/video.test.js
git commit -m "feat: add Veo scene clip generation with polling and download"
```

---

## Task 4: 파이프라인 통합 + 우아한 스킵 (`pipeline.js`)

**Files:**
- Modify: `server/pipeline.js`
- Modify: `tests/server/pipeline.test.js` (테스트 추가)

핵심 규칙: `GEMINI_API_KEY` 또는 레퍼런스 이미지가 없으면 **scene까지만 내보내고 done** — Phase A 동작 보존. 클립 생성 실패는 치명적이지 않다(이미 이미지 체험이 진행 중) — 에러 대신 상태 메시지로 처리.

- [ ] **Step 1: 실패하는 테스트 추가** (`tests/server/pipeline.test.js`에 append)

```js
// --- Phase B additions ---

function fakeGenAi() {
  return {
    interactions: {
      create: vi.fn(async () => ({ output_image: { data: 'aW1n' } })),
    },
    models: {
      generateVideos: vi.fn(async () => ({
        done: true,
        response: { generatedVideos: [{ video: { name: 'files/x' } }] },
      })),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

describe('runExperiencePipeline — Phase B visuals', () => {
  const base = { imageBase64: 'aGVsbG8=', mediaType: 'image/jpeg' }
  const reference = { data: 'cmVm', mimeType: 'image/png' }

  it('skips visual stages gracefully when genAi is unavailable', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({ ...base, emit, client: fakeClient(), genAi: null, reference })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).toContain('scene')
    expect(types).not.toContain('image')
    expect(types).not.toContain('clip')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('skips visual stages gracefully when reference image is absent', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({ ...base, emit, client: fakeClient(), genAi: fakeGenAi(), reference: null })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types).not.toContain('image')
    expect(emit.mock.calls.at(-1)[0]).toMatchObject({ type: 'status', stage: 'done' })
  })

  it('runs drawing then animating stages and emits images and clip', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi: fakeGenAi(), reference,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const events = emit.mock.calls.map((c) => c[0])
    const stages = events.filter((e) => e.type === 'status').map((e) => e.stage)
    expect(stages).toEqual(['reading', 'designing', 'drawing', 'animating', 'done'])
    expect(events.filter((e) => e.type === 'image')).toHaveLength(1) // validScene has 1 beat
    expect(events.filter((e) => e.type === 'clip')).toHaveLength(1)
    // scene must arrive BEFORE drawing starts (frontend shows artifacts progressively)
    expect(events.findIndex((e) => e.type === 'scene'))
      .toBeLessThan(events.findIndex((e) => e.type === 'status' && e.stage === 'drawing'))
  })

  it('still reaches done when clip generation fails', async () => {
    const genAi = fakeGenAi()
    genAi.models.generateVideos = vi.fn(async () => { throw new Error('veo down') })
    const emit = vi.fn()
    await runExperiencePipeline({
      ...base, emit, client: fakeClient(), genAi, reference,
      saveDir: '/tmp/generated', sleep: async () => {},
    })
    const events = emit.mock.calls.map((c) => c[0])
    expect(events.filter((e) => e.type === 'clip')).toHaveLength(0)
    expect(events.filter((e) => e.type === 'error')).toHaveLength(0)
    expect(events.at(-1)).toMatchObject({ type: 'status', stage: 'done' })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server/pipeline.test.js`
Expected: 신규 4개 FAIL (기존 3개는 PASS 유지 — 시그니처가 하위호환이어야 함).

- [ ] **Step 3: `server/pipeline.js` 전체 교체**

```js
// server/pipeline.js
import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from './scene-schema.js'
import { loadReferenceImage, generateBeatImages } from './images.js'
import { generateSceneClip } from './video.js'
import { GENERATED_DIR } from './paths.js'

function defaultGenAi() {
  if (!process.env.GEMINI_API_KEY) return null
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
}

// Pick the most dramatic beat to animate: first high-intensity shake, else beat 0.
function heroBeatIndex(scene) {
  const i = scene.beats.findIndex((b) =>
    (b.effects ?? []).some((e) => e.type === 'shake' && e.intensity === 'high'),
  )
  return i >= 0 ? i : 0
}

export async function runExperiencePipeline({
  imageBase64,
  mediaType,
  emit,
  client = new Anthropic(),
  genAi = defaultGenAi(),
  reference = loadReferenceImage(),
  saveDir = GENERATED_DIR,
  sleep,
}) {
  emit({ type: 'status', stage: 'reading', label: 'Reading the page...' })

  const stream = client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: SCENE_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: USER_INSTRUCTION },
        ],
      },
    ],
  })

  const message = await stream.finalMessage()

  if (message.stop_reason === 'refusal') {
    throw new Error('The model refused to process this image.')
  }

  const textBlock = message.content.find((b) => b.type === 'text')
  if (!textBlock) {
    throw new Error('No text content in model response.')
  }

  emit({ type: 'status', stage: 'designing', label: 'Designing the sensory experience...' })

  const scene = JSON.parse(textBlock.text)
  emit({ type: 'scene', scene })

  // Phase B visuals — skip gracefully when unavailable (Phase A behavior preserved).
  if (!genAi || !reference) {
    emit({ type: 'status', stage: 'done', label: 'Experience ready!' })
    return
  }

  emit({ type: 'status', stage: 'drawing', label: 'Drawing the scenes...' })
  const images = await generateBeatImages({ scene, reference, emit, ai: genAi })

  // Frontend starts the image-backed experience on this signal;
  // the clip keeps generating in the background.
  emit({ type: 'status', stage: 'animating', label: 'Breathing motion into the scene...' })

  const heroIdx = heroBeatIndex(scene)
  const hero = images.find((img) => img.index === heroIdx) ?? images[0]
  if (hero) {
    try {
      await generateSceneClip({
        imageBase64: hero.src.slice(hero.src.indexOf(',') + 1),
        prompt:
          `${scene.beats[hero.index].amplifiedCaption}. ` +
          `Cinematic children's storybook animation, gentle camera movement, matching the illustration's art style.`,
        emit,
        ai: genAi,
        saveDir,
        ...(sleep ? { sleep } : {}),
      })
    } catch {
      // Clip is an upgrade, not a requirement — the image experience already played.
      emit({ type: 'status', stage: 'animating', label: 'Animation unavailable this time.' })
    }
  }

  emit({ type: 'status', stage: 'done', label: 'Experience complete!' })
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS (기존 + images 3 + video 2 + pipeline 신규 4 = 39).

- [ ] **Step 5: Commit**

```bash
git add server/pipeline.js tests/server/pipeline.test.js
git commit -m "feat: integrate visual generation stages into pipeline with graceful skip"
```

---

## Task 5: 프런트 스트림 소비 개편 (`upload.js`)

**Files:**
- Modify: `src/upload.js`
- Modify: `tests/upload.test.js` (개편)

`consumeExperienceStream`을 콜백 기반으로 전환: `{ onStatus, onScene, onImage, onClip }`. 반환 프로미스는 **스트림 종료 시** resolve(요약 객체), `error` 이벤트/scene 부재 시 reject. 프런트는 콜백으로 스트림 종료 전에 행동한다.

- [ ] **Step 1: `tests/upload.test.js` 전체 교체**

```js
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
  it('dispatches status/scene/image/clip callbacks and resolves with a summary', async () => {
    const events = [
      { type: 'status', stage: 'reading', label: 'Reading the page...' },
      { type: 'scene', scene },
      { type: 'image', index: 0, src: 'data:image/png;base64,aW1n' },
      { type: 'clip', url: '/api/media/clip-1.mp4' },
      { type: 'status', stage: 'done', label: 'Experience complete!' },
    ]
    const handlers = {
      onStatus: vi.fn(), onScene: vi.fn(), onImage: vi.fn(), onClip: vi.fn(),
    }
    const summary = await consumeExperienceStream(ndjsonResponse(events), handlers)
    expect(handlers.onStatus).toHaveBeenCalledWith('Reading the page...', 'reading')
    expect(handlers.onScene).toHaveBeenCalledWith(scene)
    expect(handlers.onImage).toHaveBeenCalledWith(0, 'data:image/png;base64,aW1n')
    expect(handlers.onClip).toHaveBeenCalledWith('/api/media/clip-1.mp4')
    expect(summary.scene).toEqual(scene)
    expect(summary.clipUrl).toBe('/api/media/clip-1.mp4')
    expect(summary.images).toEqual({ 0: 'data:image/png;base64,aW1n' })
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/upload.test.js`
Expected: FAIL — 새 시그니처 미구현.

- [ ] **Step 3: `src/upload.js` 전체 교체**

```js
// src/upload.js

// Read an NDJSON experience stream, dispatching callbacks as artifacts arrive.
// Resolves with { scene, images, clipUrl } when the stream ends.
export async function consumeExperienceStream(
  response,
  { onStatus = () => {}, onScene = () => {}, onImage = () => {}, onClip = () => {} } = {},
) {
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status ?? 'network error'})`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const summary = { scene: null, images: {}, clipUrl: null }

  const handleLine = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'status') onStatus(event.label, event.stage)
    else if (event.type === 'scene') {
      summary.scene = event.scene
      onScene(event.scene)
    } else if (event.type === 'image') {
      summary.images[event.index] = event.src
      onImage(event.index, event.src)
    } else if (event.type === 'clip') {
      summary.clipUrl = event.url
      onClip(event.url)
    } else if (event.type === 'error') throw new Error(event.message)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      handleLine(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 1)
    }
  }
  if (buffer.trim()) handleLine(buffer)

  if (!summary.scene) throw new Error('Stream ended with no scene.')
  return summary
}

// Convert a File to { imageBase64, mediaType } for the API.
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
      resolve({ imageBase64: base64, mediaType: file.type })
    }
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsDataURL(file)
  })
}

// Full upload flow: POST the photo, dispatch artifact callbacks, resolve at stream end.
export async function requestExperience(file, handlers) {
  const payload = await fileToBase64(file)
  const response = await fetch('/api/experience', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return consumeExperienceStream(response, handlers)
}
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS (40 tests).

- [ ] **Step 5: Commit**

```bash
git add src/upload.js tests/upload.test.js
git commit -m "feat: callback-based stream consumption for progressive artifacts"
```

---

## Task 6: UI — 산출물 공개 + 이미지 체험 + 클립 리플레이

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles.css`

동작: 이미지가 도착할 때마다 썸네일 공개 → `animating` 신호에 **이미지 체험 즉시 시작**(배경음악 포함) → 클립 도착 시 "✨ Watch the animated version" 버튼 → 클릭하면 클립을 배경으로 다시 재생.

- [ ] **Step 1: `index.html`의 `.upload-block`을 다음으로 교체**

```html
<div class="upload-block">
  <label for="book-photo" class="upload-label">or use your own book</label>
  <input id="book-photo" type="file" accept="image/jpeg,image/png,image/webp" />
  <p id="upload-status" class="upload-status" role="status"></p>
  <div id="artifact-strip" class="artifact-strip"></div>
</div>
```

그리고 `#experience-screen`의 `#stage` 아래(섹션 안)에 추가:

```html
<button id="replay-clip" type="button" class="replay-clip hidden">
  ✨ Watch the animated version
</button>
```

- [ ] **Step 2: `src/styles.css` 끝에 추가**

```css
.artifact-strip { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center;
  max-width: 480px; }
.artifact-strip img { width: 96px; height: 54px; object-fit: cover;
  border-radius: 8px; opacity: 0; animation: artifact-in 600ms ease forwards; }
@keyframes artifact-in { to { opacity: 1; } }
.replay-clip { margin-top: 16px; background: #2d2d3a; }
```

- [ ] **Step 3: `src/main.js` 전체 교체**

```js
// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { applyEffect } from './effects/registry.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')
const artifactStrip = document.getElementById('artifact-strip')
const replayBtn = document.getElementById('replay-clip')

let bgm = null

function startBgm() {
  stopBgm()
  bgm = new Audio('/audio/bgm.mp3')
  bgm.loop = true
  bgm.volume = 0.25
  bgm.play?.().catch(() => {}) // silently skip if the asset is absent
}

function stopBgm() {
  bgm?.pause()
  bgm = null
}

function showExperienceScreen() {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
}

// Play a scene; images (index -> src) become per-beat backgrounds unless a clip is playing.
async function playScene(rawScene, { images = {}, clipUrl = null, withBgm = false } = {}) {
  const scene = validateScene(rawScene)
  showExperienceScreen()
  if (withBgm) startBgm()

  applyEffect(stage, { type: 'image', src: '' }) // clear previous background
  if (clipUrl) applyEffect(stage, { type: 'clip', src: clipUrl })
  else applyEffect(stage, { type: 'clip', src: '' })

  const beats = scene.beats.map((beat, i) =>
    !clipUrl && images[i]
      ? { ...beat, effects: [{ type: 'image', src: images[i] }, ...beat.effects] }
      : beat,
  )

  const engine = createTimelineEngine({ stage })
  await engine.play({ ...scene, beats })
}

startBtn?.addEventListener('click', () => {
  playScene(sampleScene).catch((err) => console.error(err))
})

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  photoInput.disabled = true
  replayBtn.classList.add('hidden')
  artifactStrip.innerHTML = ''

  let scene = null
  const images = {}
  let playbackStarted = false

  const startPlayback = () => {
    if (playbackStarted || !scene) return
    playbackStarted = true
    uploadStatus.textContent = ''
    playScene(scene, { images, withBgm: true }).catch((err) => {
      uploadStatus.textContent = err.message
    })
  }

  try {
    const summary = await requestExperience(file, {
      onStatus: (label, stageName) => {
        uploadStatus.textContent = label
        // Images are done once animation starts — begin the experience now.
        if (stageName === 'animating') startPlayback()
        if (stageName === 'done') startPlayback() // covers the no-visuals path
      },
      onScene: (s) => {
        scene = s
        uploadStatus.textContent = `"${s.title}" — designing the experience...`
      },
      onImage: (index, src) => {
        images[index] = src
        const img = document.createElement('img')
        img.src = src
        img.alt = `Scene ${index + 1}`
        artifactStrip.appendChild(img)
      },
      onClip: (url) => {
        replayBtn.classList.remove('hidden')
        replayBtn.onclick = () => {
          replayBtn.classList.add('hidden')
          playScene(scene, { clipUrl: url, withBgm: true }).catch((err) =>
            console.error(err),
          )
        }
      },
    })
    // Stream finished — make sure playback happened even if no status fired.
    scene = summary.scene
    startPlayback()
  } catch (err) {
    uploadStatus.textContent = err.message
  } finally {
    photoInput.disabled = false
  }
})
```

- [ ] **Step 4: 전체 테스트 + 문법 확인**

Run: `npm run test && node --check src/main.js`
Expected: 전부 PASS, 문법 OK.

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js src/styles.css
git commit -m "feat: progressive artifact reveal, image-backed playback, clip replay"
```

---

## Task 7: 에셋 슬롯 + E2E 수동 검증 (키·에셋 필요)

**Files:**
- Create: `public/audio/.gitkeep` (bgm.mp3 자리)
- 사용자 제공: `server/style-reference.png`, `public/audio/bgm.mp3`

- [ ] **Step 1: 에셋 디렉터리 준비**

```bash
mkdir -p public/audio && touch public/audio/.gitkeep
git add public/audio/.gitkeep && git commit -m "chore: add audio asset slot"
```

- [ ] **Step 2: 사용자 에셋 배치 확인**

- `server/style-reference.png` — 그림체 레퍼런스 (없으면 시각 단계 자동 스킵)
- `public/audio/bgm.mp3` — 배경음악 (없으면 무음으로 진행)
- `.env`에 `GEMINI_API_KEY` 설정

- [ ] **Step 3: 시각 단계 스킵 경로 확인 (레퍼런스/키 없이)**

Run: 서버+dev 기동 후 책 사진 업로드.
Expected: Phase A와 동일하게 텍스트+코드효과 체험 동작 (회귀 없음).

- [ ] **Step 4: 풀 파이프라인 E2E (키+레퍼런스 배치 후)**

브라우저에서 책 사진 업로드.
Expected:
1. "Reading the page..." → 씬 제목 표시
2. "Drawing the scenes..." → 썸네일이 하나씩 나타남 (그림체가 레퍼런스와 유사한지 확인)
3. "Breathing motion into the scene..." → **이미지 배경 + 배경음악과 함께 체험 즉시 시작**
4. 재생 중/후 클립 완성 시 "✨ Watch the animated version" 버튼 등장 → 클릭 시 움직이는 클립(오디오 포함) 배경으로 재생
5. 콘솔 에러 없음

- [ ] **Step 5: Commit** (검증 중 수정이 있었다면)

```bash
git add -A && git commit -m "fix: adjustments from Phase B end-to-end verification"
```

---

## 완료 기준 (Definition of Done)
- `npm run test` 전부 통과 (~40 tests).
- 키/레퍼런스 없으면 Phase A 동작 그대로 (우아한 스킵).
- 풀 경로: 사진 → 원문·비트 → 그림체 일러스트 순차 공개 → 이미지+음악 체험 즉시 시작 → Veo 클립 도착 시 애니메이션 버전 리플레이.
- 클립 실패해도 체험은 완결됨 (업그레이드 실패 ≠ 체험 실패).

## 이후 (선택, Phase C)
- ElevenLabs 내레이션/효과음으로 품질 업그레이드, 비트별 클립 확장, 샘플 씬(Tier 1)에 생성 에셋 채워넣기.
