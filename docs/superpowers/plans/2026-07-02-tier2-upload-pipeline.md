# Tier 2 Phase A — 사진 업로드 → Claude 감각 체험 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자가 책 페이지 사진을 업로드하면, Claude vision이 원문 추출 + 비트 타임라인(증폭 자막·감각 효과·내레이션)을 생성하고, 산출물이 단계별로 화면에 공개된 뒤 기존 Tier 1 엔진으로 재생된다.

**Architecture:** 가벼운 Express 백엔드가 API 키를 보호하고 Claude 호출을 오케스트레이션한다. 프런트가 사진을 base64로 POST하면 백엔드가 NDJSON 스트림으로 진행 상태(`status`) → 완성된 씬(`scene`)을 순차 전송한다. 프런트는 씬을 `validateScene`으로 검증 후 기존 `createTimelineEngine`으로 재생한다. **Tier 1의 엔진·효과 부품·데이터 모델을 그대로 재사용하고, 콘텐츠 소스만 교체한다.**

**Tech Stack:** Node + Express(백엔드), `@anthropic-ai/sdk`(Claude Opus 4.8, vision + adaptive thinking + structured outputs), Vite dev proxy, Vitest.

**Scope note (Phase A):** 이 플랜은 텍스트·감각 효과 파이프라인까지만 다룬다. 이미지 생성(Nano Banana)·영상 생성(Veo)·효과음(ElevenLabs)은 Phase B(별도 플랜)에서 이 스트림에 단계로 추가한다. Phase A의 업로드 체험은 흔들림·번쩍임·증폭 자막·SpeechSynthesis 내레이션으로 동작한다.

**API usage notes (구현자 필독):**
- 모델 ID는 정확히 `claude-opus-4-8`. 날짜 접미사 붙이지 말 것.
- `thinking: { type: "adaptive" }` 사용. `budget_tokens`/`temperature`/`top_p`/`top_k`는 이 모델에서 400 에러 — 절대 넣지 말 것.
- 구조화 출력은 `output_config: { format: { type: "json_schema", schema } }`. (구식 `output_format` 파라미터 금지.) 스키마의 모든 object에 `additionalProperties: false` 필수, `minimum`/`maxLength` 같은 수치·문자열 제약은 미지원이라 넣지 말 것.
- 스트리밍: `client.messages.stream(...)` 후 `await stream.finalMessage()`.
- 응답 파싱 전 `stop_reason` 확인 (`refusal`이면 에러 처리).
- 클라이언트는 zero-arg `new Anthropic()` — `ANTHROPIC_API_KEY` 환경변수 또는 `ant auth login` 프로필을 자동 인식. 코드에 키 하드코딩 금지.

---

## File Structure

- `package.json` — 의존성 추가(`express`, `@anthropic-ai/sdk`), `server` 스크립트
- `vite.config.js` — `/api` → `http://localhost:8787` dev proxy 추가
- `server/index.js` — 서버 부트(листен만, thin)
- `server/app.js` — Express 앱 팩토리(파이프라인 주입 가능 — 테스트 용이)
- `server/pipeline.js` — Claude 호출 + NDJSON 이벤트 방출(클라이언트 주입 가능)
- `server/scene-schema.js` — 씬 JSON Schema + 시스템 프롬프트 (콘텐츠 계약의 심장)
- `src/upload.js` — 프런트 업로드 흐름(파일 → base64 → POST → 스트림 소비)
- `src/main.js` — 업로드 진입점 연결 (수정)
- `index.html` — "Use My Book" 업로드 UI + 진행 상태 영역 (수정)
- `src/styles.css` — 진행 상태 스타일 (수정)
- `tests/server/scene-schema.test.js`
- `tests/server/pipeline.test.js`
- `tests/upload.test.js`

경계: `scene-schema.js`(계약) ↔ `pipeline.js`(호출/방출) ↔ `app.js`(HTTP) ↔ `upload.js`(소비/재생)가 각각 단일 책임. 프런트–백 사이 계약은 "Tier 1 씬 모델과 동일한 JSON"뿐이다.

---

## Task 1: 의존성 + 서버 스캐폴드 + dev proxy

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js`
- Create: `server/index.js`
- Create: `server/app.js`

- [ ] **Step 1: 의존성 설치**

Run: `npm install express @anthropic-ai/sdk`
Expected: 두 패키지가 `dependencies`에 추가됨.

- [ ] **Step 2: `package.json` scripts에 서버 스크립트 추가**

`"scripts"`에 추가:

```json
"server": "node server/index.js"
```

- [ ] **Step 3: `vite.config.js`에 proxy 추가** (전체 교체)

```js
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 4: `server/app.js` 작성** (앱 팩토리 — 파이프라인은 주입식)

```js
// server/app.js
import express from 'express'
import { runExperiencePipeline } from './pipeline.js'

export function createApp({ pipeline = runExperiencePipeline } = {}) {
  const app = express()
  app.use(express.json({ limit: '20mb' })) // base64 book photos

  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  app.post('/api/experience', async (req, res) => {
    const { imageBase64, mediaType } = req.body ?? {}
    if (!imageBase64 || !mediaType) {
      res.status(400).json({ error: 'imageBase64 and mediaType are required' })
      return
    }

    // NDJSON stream: one JSON event per line
    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache')

    const emit = (event) => {
      res.write(JSON.stringify(event) + '\n')
    }

    try {
      await pipeline({ imageBase64, mediaType, emit })
    } catch (err) {
      emit({ type: 'error', message: err?.message ?? 'pipeline failed' })
    } finally {
      res.end()
    }
  })

  return app
}
```

- [ ] **Step 5: `server/index.js` 작성**

```js
// server/index.js
import { createApp } from './app.js'

const port = process.env.PORT ?? 8787
createApp().listen(port, () => {
  console.log(`experience server listening on http://localhost:${port}`)
})
```

- [ ] **Step 6: 헬스 체크로 서버 기동 확인**

Run: `npm run server & sleep 1 && curl -s http://localhost:8787/api/health && kill %1`
Expected: `{"ok":true}` 출력. (이 시점에 `server/pipeline.js`가 없어 import 에러가 나면, Task 2·3 완료 후 다시 확인해도 된다 — 커밋은 Task 3 뒤로 미루지 말고 아래처럼 진행)

- [ ] **Step 7: 임시 파이프라인 스텁 생성** (Task 3에서 전체 교체)

```js
// server/pipeline.js
export async function runExperiencePipeline({ emit }) {
  emit({ type: 'error', message: 'pipeline not implemented yet' })
}
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.js server
git commit -m "feat: scaffold experience server with NDJSON endpoint"
```

---

## Task 2: 씬 스키마 + 시스템 프롬프트 (`scene-schema.js`)

**Files:**
- Create: `server/scene-schema.js`
- Test: `tests/server/scene-schema.test.js`

Claude가 반환할 JSON은 **Tier 1 씬 모델과 동일한 형태**여야 한다(`validateScene` 통과). Phase A에서 허용하는 효과는 `shake`와 `flash`뿐(사운드·이미지 에셋이 아직 없으므로).

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/server/scene-schema.test.js
import { describe, it, expect } from 'vitest'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from '../../server/scene-schema.js'

function collectObjects(node, out = []) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    if (node.type === 'object') out.push(node)
    for (const v of Object.values(node)) collectObjects(v, out)
  } else if (Array.isArray(node)) {
    for (const v of node) collectObjects(v, out)
  }
  return out
}

describe('SCENE_SCHEMA', () => {
  it('matches the Tier 1 scene shape at the top level', () => {
    expect(SCENE_SCHEMA.required).toEqual(['id', 'title', 'beats'])
  })

  it('every object schema forbids additional properties (structured outputs requirement)', () => {
    for (const obj of collectObjects(SCENE_SCHEMA)) {
      expect(obj.additionalProperties).toBe(false)
    }
  })

  it('only allows shake and flash effect types in Phase A', () => {
    const effectSchemas = SCENE_SCHEMA.properties.beats.items.properties.effects.items.anyOf
    const types = effectSchemas.map((s) => s.properties.type.const)
    expect(types.sort()).toEqual(['flash', 'shake'])
  })

  it('does not use unsupported numeric constraints', () => {
    const json = JSON.stringify(SCENE_SCHEMA)
    expect(json).not.toMatch(/"minimum"|"maximum"|"minLength"|"maxLength"/)
  })

  it('prompts are non-empty strings mentioning English output', () => {
    expect(SYSTEM_PROMPT).toMatch(/English/)
    expect(typeof USER_INSTRUCTION).toBe('string')
    expect(USER_INSTRUCTION.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server/scene-schema.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
// server/scene-schema.js

const shakeEffect = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'intensity', 'duration'],
  properties: {
    type: { const: 'shake' },
    intensity: { enum: ['low', 'high'] },
    duration: { type: 'integer', description: 'milliseconds, 300-900' },
  },
}

const flashEffect = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'color', 'strength', 'duration'],
  properties: {
    type: { const: 'flash' },
    color: { type: 'string', description: 'CSS color, e.g. #ffffff or #000000' },
    strength: { type: 'number', description: 'opacity 0.1-0.8' },
    duration: { type: 'integer', description: 'milliseconds, 150-500' },
  },
}

export const SCENE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'title', 'beats'],
  properties: {
    id: { type: 'string', description: 'kebab-case scene id' },
    title: { type: 'string', description: 'short scene title' },
    beats: {
      type: 'array',
      description: '3 to 6 beats covering the page text in order',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'amplifiedCaption', 'duration', 'narration', 'effects'],
        properties: {
          text: { type: 'string', description: 'verbatim sentence(s) from the page' },
          amplifiedCaption: {
            type: 'string',
            description: 'imaginative sensory amplification of the text',
          },
          duration: { type: 'integer', description: 'milliseconds, 2500-4500' },
          narration: { type: 'string', description: 'same as text, for read-aloud' },
          effects: {
            type: 'array',
            items: { anyOf: [shakeEffect, flashEffect] },
          },
        },
      },
    },
  },
}

export const SYSTEM_PROMPT = `You are a sensory experience designer for a children's literary imagination app.
Given a photo of a book page, you extract the printed text and turn it into a "beat timeline"
that amplifies the literary imagery into sensory experience.

Rules:
- Extract the actual printed text from the photo. Split it into 3-6 sequential beats.
- beat.text: the verbatim text for that beat (fix obvious OCR-style artifacts only).
- beat.amplifiedCaption: fill the imaginative gap. If the text says "The door closed.",
  the caption might be "The whole house shuddered with a thud". Evocative, concrete, sensory.
- beat.narration: copy of beat.text (used for read-aloud).
- beat.duration: 2500-4500 ms depending on text length.
- effects: use shake for physical impact/movement (high for slams, crashes, thunder;
  low for wind, trembling, footsteps). Use flash for light/impact moments
  (white flash for lightning/brightness, dark flash color #000000 for dread/impact).
  Quiet beats may have an empty effects array - silence is also a sensory choice.
- ALL output text must be in English. If the page is in another language, translate it.
- The scene id must be kebab-case; the title short and evocative.`

export const USER_INSTRUCTION =
  'Read this book page photo and produce the sensory beat timeline JSON.'
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/server/scene-schema.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add server/scene-schema.js tests/server/scene-schema.test.js
git commit -m "feat: add scene JSON schema and sensory-design prompt"
```

---

## Task 3: Claude 파이프라인 (`pipeline.js`)

**Files:**
- Modify: `server/pipeline.js` (스텁 전체 교체)
- Test: `tests/server/pipeline.test.js`

파이프라인은 `emit`으로 진행 이벤트를 방출한다: `status(reading)` → Claude 스트리밍 호출 → `status(designing)` → `scene`. 클라이언트는 주입 가능해서 실제 API 없이 테스트한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/server/pipeline.test.js
import { describe, it, expect, vi } from 'vitest'
import { runExperiencePipeline } from '../../server/pipeline.js'

const validScene = {
  id: 'windy-door',
  title: 'A Windy Day',
  beats: [
    {
      text: 'The door slammed shut.',
      amplifiedCaption: 'The whole house shuddered',
      duration: 3000,
      narration: 'The door slammed shut.',
      effects: [{ type: 'shake', intensity: 'high', duration: 600 }],
    },
  ],
}

function fakeClient({ stopReason = 'end_turn', text = JSON.stringify(validScene) } = {}) {
  return {
    messages: {
      stream: vi.fn(() => ({
        finalMessage: async () => ({
          stop_reason: stopReason,
          content: [{ type: 'text', text }],
        }),
      })),
    },
  }
}

describe('runExperiencePipeline', () => {
  it('emits status events then the parsed scene', async () => {
    const emit = vi.fn()
    await runExperiencePipeline({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/jpeg',
      emit,
      client: fakeClient(),
    })
    const types = emit.mock.calls.map((c) => c[0].type)
    expect(types[0]).toBe('status')
    expect(types[types.length - 1]).toBe('scene')
    const sceneEvent = emit.mock.calls.find((c) => c[0].type === 'scene')[0]
    expect(sceneEvent.scene).toEqual(validScene)
  })

  it('sends the image and schema to Claude', async () => {
    const client = fakeClient()
    await runExperiencePipeline({
      imageBase64: 'aGVsbG8=',
      mediaType: 'image/png',
      emit: vi.fn(),
      client,
    })
    const params = client.messages.stream.mock.calls[0][0]
    expect(params.model).toBe('claude-opus-4-8')
    expect(params.thinking).toEqual({ type: 'adaptive' })
    expect(params.output_config.format.type).toBe('json_schema')
    const imageBlock = params.messages[0].content.find((b) => b.type === 'image')
    expect(imageBlock.source).toEqual({
      type: 'base64',
      media_type: 'image/png',
      data: 'aGVsbG8=',
    })
  })

  it('throws on refusal instead of emitting a scene', async () => {
    const emit = vi.fn()
    await expect(
      runExperiencePipeline({
        imageBase64: 'aGVsbG8=',
        mediaType: 'image/jpeg',
        emit,
        client: fakeClient({ stopReason: 'refusal', text: '' }),
      }),
    ).rejects.toThrow(/refus/i)
    expect(emit.mock.calls.find((c) => c[0].type === 'scene')).toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/server/pipeline.test.js`
Expected: FAIL — 스텁에는 해당 동작 없음.

- [ ] **Step 3: 구현 작성 (스텁 전체 교체)**

```js
// server/pipeline.js
import Anthropic from '@anthropic-ai/sdk'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from './scene-schema.js'

export async function runExperiencePipeline({
  imageBase64,
  mediaType,
  emit,
  client = new Anthropic(),
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
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/server/pipeline.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: 전체 테스트 회귀 확인**

Run: `npm run test`
Expected: 기존 19개 + 신규 8개 = 전부 PASS.

- [ ] **Step 6: Commit**

```bash
git add server/pipeline.js tests/server/pipeline.test.js
git commit -m "feat: add Claude vision pipeline producing beat timeline"
```

---

## Task 4: 프런트 업로드 흐름 (`upload.js`)

**Files:**
- Create: `src/upload.js`
- Test: `tests/upload.test.js`

스트림 소비 로직(`consumeExperienceStream`)을 순수하게 분리해 테스트하고, 파일→base64 변환과 fetch는 얇은 래퍼로 둔다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/upload.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
// src/upload.js

// Read an NDJSON experience stream; call onStatus per status event,
// resolve with the scene, reject on error events or missing scene.
export async function consumeExperienceStream(response, { onStatus }) {
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status ?? 'network error'})`)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let scene = null

  const handleLine = (line) => {
    if (!line.trim()) return
    const event = JSON.parse(line)
    if (event.type === 'status') onStatus(event.label)
    else if (event.type === 'scene') scene = event.scene
    else if (event.type === 'error') throw new Error(event.message)
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

  if (!scene) throw new Error('Stream ended with no scene.')
  return scene
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

// Full upload flow: POST the photo, stream progress, return the scene.
export async function requestExperience(file, { onStatus }) {
  const payload = await fileToBase64(file)
  const response = await fetch('/api/experience', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return consumeExperienceStream(response, { onStatus })
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/upload.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/upload.js tests/upload.test.js
git commit -m "feat: add upload flow with NDJSON stream consumption"
```

---

## Task 5: UI 연결 — "Use My Book"

**Files:**
- Modify: `index.html`
- Modify: `src/main.js`
- Modify: `src/styles.css`

- [ ] **Step 1: `index.html`의 `#start-screen` 섹션을 다음으로 교체**

```html
<section id="start-screen" class="screen">
  <h1>Literary Imagination Demo</h1>
  <button id="start-sample" type="button">Start Sample Experience</button>
  <div class="upload-block">
    <label for="book-photo" class="upload-label">or use your own book</label>
    <input id="book-photo" type="file" accept="image/jpeg,image/png,image/webp" />
    <p id="upload-status" class="upload-status" role="status"></p>
  </div>
</section>
```

- [ ] **Step 2: `src/styles.css` 끝에 추가**

```css
.upload-block { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.upload-label { color: #aaa; font-size: 15px; }
.upload-status { min-height: 1.4em; color: #ffd479; font-size: 15px; }
```

- [ ] **Step 3: `src/main.js` 전체 교체**

```js
// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'
import { requestExperience } from './upload.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')
const photoInput = document.getElementById('book-photo')
const uploadStatus = document.getElementById('upload-status')

async function playScene(rawScene) {
  const scene = validateScene(rawScene)
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
  const engine = createTimelineEngine({ stage })
  await engine.play(scene)
}

startBtn?.addEventListener('click', () => {
  playScene(sampleScene)
})

photoInput?.addEventListener('change', async () => {
  const file = photoInput.files?.[0]
  if (!file) return
  photoInput.disabled = true
  try {
    const scene = await requestExperience(file, {
      onStatus: (label) => {
        uploadStatus.textContent = label
      },
    })
    uploadStatus.textContent = ''
    await playScene(scene)
  } catch (err) {
    uploadStatus.textContent = err.message
  } finally {
    photoInput.disabled = false
  }
})
```

- [ ] **Step 4: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: 전부 PASS (기존 19 + 서버 8 + 업로드 3 = 30).

- [ ] **Step 5: Commit**

```bash
git add index.html src/main.js src/styles.css
git commit -m "feat: wire book photo upload into the experience UI"
```

---

## Task 6: End-to-end 수동 검증 (API 키 필요)

**Files:** 없음 (검증만)

- [ ] **Step 1: 자격 증명 확인**

Run: `ant auth status || echo "need: export ANTHROPIC_API_KEY=..."`
Expected: 활성 프로필 표시, 또는 `ANTHROPIC_API_KEY` 설정 필요 안내. 키가 없으면 사용자에게 요청하고 이 태스크를 보류.

- [ ] **Step 2: 두 프로세스 기동**

Run: 터미널 1 `npm run server`, 터미널 2 `npm run dev`
Expected: 서버 8787, Vite dev 서버 기동.

- [ ] **Step 3: 실제 책 사진으로 체험**

브라우저에서 dev URL 접속 → "use your own book"에 영어/한국어 책 페이지 사진 업로드.
Expected:
1. "Reading the page..." 상태 표시 (수 초)
2. "Designing the sensory experience..." 표시
3. 체험 화면 전환 → 추출된 원문이 비트별로 등장, 증폭 자막·흔들림·번쩍임·내레이션 동작
4. 콘솔 에러 없음

- [ ] **Step 4: 실패 경로 확인**

이미지가 아닌 파일 또는 글자 없는 사진 업로드.
Expected: 앱이 죽지 않고 `#upload-status`에 에러 메시지 표시.

- [ ] **Step 5: Commit** (검증 중 수정이 있었다면)

```bash
git add -A && git commit -m "fix: adjustments from end-to-end verification"
```

---

## 완료 기준 (Definition of Done)
- `npm run test` 전부 통과 (~30 tests).
- 서버 없이도 샘플 체험은 기존대로 동작 (Tier 1 회귀 없음).
- 책 사진 업로드 → 상태 메시지 순차 표시 → Claude 생성 씬이 기존 엔진으로 재생.
- 에러(거부, 네트워크, 잘못된 파일)가 UI에 표시되고 앱이 살아있음.
- API 키는 서버에만 존재 (프런트/저장소에 노출 없음).

## 다음 플랜 (Phase B, 별도)
- 파이프라인에 단계 추가: 그림체 이미지 생성(Nano Banana) → `status(drawing)` + `image` 이벤트 → Veo 영상 → `status(animating)` + `clip` 이벤트 → ElevenLabs 사운드/내레이션. 프런트는 도착하는 대로 `showImage`/`playClip` 부품으로 교체 표시 — "상상이 조립되는 쇼"의 완성.
