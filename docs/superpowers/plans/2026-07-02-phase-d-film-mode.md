# Phase D — 영화 모드 (연속 필름 + 시네마 연출) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 비트별 클립 슬라이드쇼를 **하나의 연속된 필름**으로 교체한다. Veo scene extension으로 비트들을 이어붙여 한 편의 영상(≈8+7×(n−1)초)을 만들고, 풀스크린 시네마 오버레이에서 자막·음악 중심으로 재생한다 — 레퍼런스(애니메이션 MV)의 "흘러가는 한 편의 영화" 느낌.

**Architecture:** 파이프라인의 `animating` 단계가 비트별 병렬 클립 대신 **순차 필름 체인**을 돌린다: 비트 0 일러스트 → image-to-video(8초) → 비트 1 프롬프트로 extension(+7초) → … → 마지막 합본만 다운로드 → `film {url}` 이벤트. 프런트는 필름 도착 시 "🎬 Watch the film" 버튼을 노출하고, 클릭하면 **풀스크린 시네마 오버레이**(영상 풀블리드 + 하단 얇은 자막 + Veo 네이티브 오디오 + 낮은 볼륨 BGM, TTS 없음)로 재생한다. 읽기 모드(텍스트+음성 싱크)는 그대로 유지 — 두 모드가 공존한다.

**Tech Stack:** 기존 스택 그대로. `server/video.js`(비트별 클립)는 필름으로 **대체·삭제**된다(YAGNI).

**API usage notes (구현자 필독, 공식 문서 확인됨):**
- 최초 세그먼트: `ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, image: { imageBytes, mimeType }, config: { durationSeconds: 8, resolution: '720p', aspectRatio: '16:9' } })` — `durationSeconds`는 **숫자**.
- **확장(scene extension)**: `ai.models.generateVideos({ model: 'veo-3.1-fast-generate-preview', prompt, video: <이전 생성의 video 객체>, config: { numberOfVideos: 1, resolution: '720p' } })`. 이전 video 객체는 `operation.response.generatedVideos[0].video`. 확장은 **+7초**, 반환 영상은 **원본+연장 합본** — 체인의 마지막 것만 `ai.files.download`하면 전체 필름.
- 확장은 720p 전용, Veo 생성 영상만 입력 가능, fast 모델 지원.
- 폴링: 기존 패턴(10초 간격 `ai.operations.getVideosOperation({ operation })`), `sleep` 주입 가능.
- 순차 체인이라 오래 걸림(세그먼트당 11초~수 분 × 비트 수). `status` 이벤트로 진행률 노출: stage는 **`animating` 유지**(프런트 재생 트리거 호환), label만 `Filming scene 2/4...`로 변화.

---

## File Structure

- `server/film.js` — `generateFilm` 순차 체인 + 폴링 (신규)
- `server/video.js` — **삭제** (비트별 클립 대체됨; `tests/server/video.test.js`도 삭제)
- `server/pipeline.js` — 클립 단계 → 필름 단계 (수정)
- `src/cinema.js` — 시네마 컨트롤러 + `beatIndexForTime` 자막 스케줄 (신규)
- `src/upload.js` — `onFilm` 핸들러 (수정: `onClip`/`clips` 제거)
- `src/main.js` — 필름 버튼 + 시네마 연동 (수정: 비트별 클립 리플레이 제거)
- `index.html`, `src/styles.css` — 시네마 오버레이 (수정)
- Tests: `tests/server/film.test.js`(신규), `tests/cinema.test.js`(신규), `pipeline.test.js`·`upload.test.js` (수정)

NDJSON 이벤트 계약(변경분):
```
{ type: 'film', url: '/api/media/film-...mp4' }        // clip 이벤트 대체
{ type: 'status', stage: 'animating', label: 'Filming scene 2/4...' }   // 진행률
```

---

## Task 1: 필름 체인 (`server/film.js`)

**Files:**
- Create: `server/film.js`
- Test: `tests/server/film.test.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/server/film.test.js
import { describe, it, expect, vi } from 'vitest'
import { generateFilm } from '../../server/film.js'

const scene = {
  id: 's', title: 't',
  beats: [
    { text: 'A', amplifiedCaption: 'wind rose', duration: 3000, effects: [] },
    { text: 'B', amplifiedCaption: 'door slammed', duration: 3000, effects: [] },
    { text: 'C', amplifiedCaption: 'silence fell', duration: 3000, effects: [] },
  ],
}
const images = [
  { index: 0, src: 'data:image/jpeg;base64,aW1nMA==' },
  { index: 1, src: 'data:image/jpeg;base64,aW1nMQ==' },
]

function fakeAi() {
  let gen = 0
  return {
    models: {
      generateVideos: vi.fn(async () => ({
        done: true,
        response: { generatedVideos: [{ video: { name: `files/v${gen++}` } }] },
      })),
    },
    operations: { getVideosOperation: vi.fn() },
    files: { download: vi.fn(async () => {}) },
  }
}

describe('generateFilm', () => {
  it('chains one initial segment plus one extension per remaining beat', async () => {
    const ai = fakeAi()
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images, emit, ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    // 3 beats => 1 image-to-video + 2 extensions
    expect(ai.models.generateVideos).toHaveBeenCalledTimes(3)
    const calls = ai.models.generateVideos.mock.calls.map((c) => c[0])
    // first call: from the beat-0 illustration
    expect(calls[0].image).toEqual({ imageBytes: 'aW1nMA==', mimeType: 'image/jpeg' })
    expect(calls[0].config.durationSeconds).toBe(8)
    expect(calls[0].prompt).toContain('wind rose')
    // extensions: chain the PREVIOUS generation's video object, no image
    expect(calls[1].video).toEqual({ name: 'files/v0' })
    expect(calls[1].image).toBeUndefined()
    expect(calls[1].prompt).toContain('door slammed')
    expect(calls[1].config).toEqual({ numberOfVideos: 1, resolution: '720p' })
    expect(calls[2].video).toEqual({ name: 'files/v1' })
    // only the FINAL combined video is downloaded
    expect(ai.files.download).toHaveBeenCalledOnce()
    expect(ai.files.download.mock.calls[0][0].file).toEqual({ name: 'files/v2' })
    expect(url).toMatch(/^\/api\/media\/film-.+\.mp4$/)
    expect(emit).toHaveBeenCalledWith({ type: 'film', url })
  })

  it('emits per-segment progress labels on the animating stage', async () => {
    const emit = vi.fn()
    await generateFilm({
      scene, images, emit, ai: fakeAi(), saveDir: '/tmp/generated', sleep: async () => {},
    })
    const labels = emit.mock.calls
      .map((c) => c[0])
      .filter((e) => e.type === 'status')
      .map((e) => e.label)
    expect(labels).toEqual([
      'Filming scene 1/3...',
      'Filming scene 2/3...',
      'Filming scene 3/3...',
    ])
    for (const e of emit.mock.calls.map((c) => c[0]).filter((e) => e.type === 'status')) {
      expect(e.stage).toBe('animating')
    }
  })

  it('returns null without images', async () => {
    const emit = vi.fn()
    const url = await generateFilm({
      scene, images: [], emit, ai: fakeAi(), saveDir: '/tmp/generated',
    })
    expect(url).toBeNull()
    expect(emit).not.toHaveBeenCalled()
  })

  it('polls pending operations until done', async () => {
    const ai = fakeAi()
    let polls = 2
    const pending = { done: false }
    const finished = {
      done: true,
      response: { generatedVideos: [{ video: { name: 'files/vX' } }] },
    }
    ai.models.generateVideos = vi.fn(async () => pending)
    ai.operations.getVideosOperation = vi.fn(async () => (--polls <= 0 ? finished : pending))
    const oneBeat = { ...scene, beats: [scene.beats[0]] }
    await generateFilm({
      scene: oneBeat, images, emit: vi.fn(), ai, saveDir: '/tmp/generated', sleep: async () => {},
    })
    expect(ai.operations.getVideosOperation).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/server/film.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 작성**

```js
// server/film.js
import path from 'node:path'

const POLL_INTERVAL_MS = 10_000

function filmPrompt(scene, beat, isFirst) {
  const opening = isFirst
    ? `Opening scene of an animated children's storybook film titled "${scene.title}"`
    : 'The film continues seamlessly into the next scene'
  return (
    `${opening}: ${beat.amplifiedCaption}. ` +
    `Cinematic 2D storybook animation, gentle camera movement, ` +
    `consistent characters and art style throughout.`
  )
}

async function awaitOperation(ai, operation, sleep) {
  while (!operation.done) {
    await sleep(POLL_INTERVAL_MS)
    operation = await ai.operations.getVideosOperation({ operation })
  }
  return operation
}

// Build one continuous film: image-to-video for the first beat, then one
// scene extension (+7s) per remaining beat. Each extension returns the full
// combined video, so only the final one is downloaded.
export async function generateFilm({
  scene,
  images,
  emit,
  ai,
  saveDir,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const sorted = [...images].sort((a, b) => a.index - b.index)
  const first = sorted[0]
  if (!first) return null

  const total = scene.beats.length
  emit({ type: 'status', stage: 'animating', label: `Filming scene 1/${total}...` })

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: filmPrompt(scene, scene.beats[first.index], true),
    image: {
      imageBytes: first.src.slice(first.src.indexOf(',') + 1),
      mimeType: first.src.slice(5, first.src.indexOf(';')),
    },
    config: { durationSeconds: 8, resolution: '720p', aspectRatio: '16:9' },
  })
  operation = await awaitOperation(ai, operation, sleep)
  let video = operation.response.generatedVideos[0].video

  for (let i = 1; i < total; i += 1) {
    emit({ type: 'status', stage: 'animating', label: `Filming scene ${i + 1}/${total}...` })
    let op = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: filmPrompt(scene, scene.beats[i], false),
      video,
      config: { numberOfVideos: 1, resolution: '720p' },
    })
    op = await awaitOperation(ai, op, sleep)
    video = op.response.generatedVideos[0].video
  }

  const filename = `film-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
  await ai.files.download({ file: video, downloadPath: path.join(saveDir, filename) })

  const url = `/api/media/${filename}`
  emit({ type: 'film', url })
  return url
}
```

- [ ] **Step 4: 통과 확인 후 Commit**

```bash
git add server/film.js tests/server/film.test.js
git commit -m "feat: continuous film generation via Veo scene extension"
```

---

## Task 2: 파이프라인 교체 + `video.js` 삭제

**Files:**
- Modify: `server/pipeline.js`
- Delete: `server/video.js`, `tests/server/video.test.js`
- Modify: `tests/server/pipeline.test.js`

- [ ] **Step 1: 테스트 수정** (`pipeline.test.js`)

- Phase B/C 테스트에서 `clip` 기대를 `film`으로 교체:
  - `'runs drawing then animating stages and emits images and clip'` → 이름과 단언을 film으로 (`events.filter(e => e.type === 'film')`이 1개, `clip` 이벤트는 0개).
  - `'still reaches done when clip generation fails'` → `genAi.models.generateVideos`가 throw하면 **film 없음 + error 없음 + done 도달** 그대로 유효 — film 기준으로 이름/단언만 갱신.
  - Phase C 테스트의 `expect(types).toContain('clip')` 및 indexed-clip 단언 → `'film'` 기대로 교체.
- 스테이지 순서 단언은 유지하되, film이 status(animating) 라벨을 자체 방출하므로 `stages`가 `['reading','designing','drawing','animating','animating',...,'done']`처럼 될 수 있다 — **중복 제거 후 비교**로 완화: `expect([...new Set(stages)]).toEqual(['reading','designing','drawing','animating','done'])`.

- [ ] **Step 2: `server/pipeline.js` 수정**

- `import { generateBeatClips } from './video.js'` → `import { generateFilm } from './film.js'`
- 클립 블록 교체:

```js
  if (images.length > 0) {
    try {
      await generateFilm({
        scene, images, emit, ai: genAi, saveDir,
        ...(sleep ? { sleep } : {}),
      })
    } catch (err) {
      console.error('film generation failed:', err?.message ?? err)
      emit({ type: 'status', stage: 'animating', label: 'Film unavailable this time.' })
    }
  } else {
    emit({ type: 'status', stage: 'animating', label: 'Breathing motion into the scenes...' })
  }
```

주의: 기존의 무조건적인 `emit(status animating 'Breathing motion...')` 라인은 **제거** — film이 자체 진행 라벨을 방출한다. 단, 이미지가 없는데 speech만 있는 경우 프런트 재생 트리거(stage `animating`)가 필요하므로 위의 `else` 분기가 그것을 보장한다.

- [ ] **Step 3: 파일 삭제**

```bash
git rm server/video.js tests/server/video.test.js
```

- [ ] **Step 4: 전체 테스트 통과 확인 후 Commit**

Run: `npm run test`

```bash
git add -A && git commit -m "feat: replace per-beat clips with continuous film in pipeline"
```

---

## Task 3: 스트림 소비 — `onFilm`

**Files:**
- Modify: `src/upload.js`
- Modify: `tests/upload.test.js`

- [ ] **Step 1: 테스트 수정** — 첫 테스트에서 `clip` 이벤트/단언을 film으로 교체:

```js
      { type: 'film', url: '/api/media/film-1.mp4' },
```
핸들러 `onFilm: vi.fn()`, 단언 `expect(handlers.onFilm).toHaveBeenCalledWith('/api/media/film-1.mp4')`, `expect(summary.film).toBe('/api/media/film-1.mp4')`. `clips` 관련 단언 제거.

- [ ] **Step 2: `src/upload.js` 수정** — `onClip`/`summary.clips` 제거, 추가:

```js
    } else if (event.type === 'film') {
      summary.film = event.url
      onFilm(event.url)
    }
```
시그니처: `{ onStatus, onScene, onImage, onSpeech = () => {}, onFilm = () => {} }`, summary 초기값 `{ scene: null, images: {}, speech: {}, film: null }`.

- [ ] **Step 3: 통과 확인 후 Commit**

```bash
git add src/upload.js tests/upload.test.js
git commit -m "feat: film event consumption replaces per-beat clips"
```

---

## Task 4: 시네마 오버레이 (`src/cinema.js` + UI)

**Files:**
- Create: `src/cinema.js`
- Test: `tests/cinema.test.js`
- Modify: `index.html`, `src/styles.css`, `src/main.js`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/cinema.test.js
import { describe, it, expect, vi } from 'vitest'
import { beatIndexForTime, createCinema } from '../src/cinema.js'

describe('beatIndexForTime', () => {
  // first segment 8s, each extension 7s
  it('maps playback time to the beat being shown', () => {
    expect(beatIndexForTime(0, 4)).toBe(0)
    expect(beatIndexForTime(7.9, 4)).toBe(0)
    expect(beatIndexForTime(8, 4)).toBe(1)
    expect(beatIndexForTime(14.9, 4)).toBe(1)
    expect(beatIndexForTime(15, 4)).toBe(2)
    expect(beatIndexForTime(22, 4)).toBe(3)
    expect(beatIndexForTime(999, 4)).toBe(3) // clamped to last beat
  })
})

describe('createCinema', () => {
  function makeDom() {
    document.body.innerHTML = `
      <div id="cinema" class="hidden">
        <video id="film-video"></video>
        <p id="film-subtitle"></p>
        <button id="cinema-close" type="button">✕</button>
      </div>`
    return {
      root: document.getElementById('cinema'),
      video: document.getElementById('film-video'),
      subtitle: document.getElementById('film-subtitle'),
      closeBtn: document.getElementById('cinema-close'),
    }
  }

  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'First line', duration: 1, effects: [] },
      { text: 'Second line', duration: 1, effects: [] },
    ],
  }

  it('open() shows the overlay, sets the source, and starts with beat 0 subtitle', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ filmUrl: '/api/media/film-1.mp4', scene })
    expect(dom.root.classList.contains('hidden')).toBe(false)
    expect(dom.video.getAttribute('src')).toBe('/api/media/film-1.mp4')
    expect(dom.subtitle.textContent).toBe('First line')
  })

  it('updates the subtitle from video time', () => {
    const dom = makeDom()
    const cinema = createCinema(dom)
    cinema.open({ filmUrl: '/x.mp4', scene })
    Object.defineProperty(dom.video, 'currentTime', { value: 9, configurable: true })
    dom.video.dispatchEvent(new Event('timeupdate'))
    expect(dom.subtitle.textContent).toBe('Second line')
  })

  it('close() hides the overlay and notifies onClose', () => {
    const dom = makeDom()
    const onClose = vi.fn()
    const cinema = createCinema(dom, { onClose })
    cinema.open({ filmUrl: '/x.mp4', scene })
    dom.closeBtn.click()
    expect(dom.root.classList.contains('hidden')).toBe(true)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 실패 확인 후 구현**

```js
// src/cinema.js

const FIRST_SEGMENT_S = 8
const EXTENSION_S = 7

// Which beat is on screen at playback time t (seconds)?
export function beatIndexForTime(t, beatCount) {
  if (t < FIRST_SEGMENT_S) return 0
  const i = 1 + Math.floor((t - FIRST_SEGMENT_S) / EXTENSION_S)
  return Math.min(i, beatCount - 1)
}

// Fullscreen film player: full-bleed video (native Veo audio), thin subtitle bar.
export function createCinema({ root, video, subtitle, closeBtn }, { onClose } = {}) {
  let beats = []

  function showSubtitle(index) {
    subtitle.textContent = beats[index]?.text ?? ''
  }

  video.addEventListener('timeupdate', () => {
    if (!beats.length) return
    showSubtitle(beatIndexForTime(video.currentTime, beats.length))
  })

  function open({ filmUrl, scene }) {
    beats = scene.beats
    video.setAttribute('src', filmUrl)
    video.muted = false // the film carries Veo's native audio
    root.classList.remove('hidden')
    showSubtitle(0)
    video.play?.()?.catch(() => {})
  }

  function close() {
    video.pause?.()
    root.classList.add('hidden')
    onClose?.()
  }

  closeBtn.addEventListener('click', close)

  return { open, close }
}
```

- [ ] **Step 3: `index.html`** — `</body>` 직전(#app 밖)에 오버레이 추가, 기존 `#replay-clip` 버튼의 텍스트를 `🎬 Watch the film`으로 교체(id는 `watch-film`으로 변경):

```html
<div id="cinema" class="hidden">
  <video id="film-video" playsinline></video>
  <div id="film-subtitle-bar"><p id="film-subtitle"></p></div>
  <button id="cinema-close" type="button" aria-label="Close">✕</button>
</div>
```

기존:
```html
<button id="replay-clip" ...>✨ Watch the animated version</button>
```
→
```html
<button id="watch-film" type="button" class="replay-clip hidden">🎬 Watch the film</button>
```

- [ ] **Step 4: `src/styles.css`에 추가**

```css
#cinema { position: fixed; inset: 0; z-index: 50; background: #000;
  display: flex; align-items: center; justify-content: center; }
#cinema.hidden { display: none; }
#film-video { width: 100vw; height: 100vh; object-fit: contain; background: #000; }
#film-subtitle-bar { position: absolute; left: 0; right: 0; bottom: 6vh;
  display: flex; justify-content: center; pointer-events: none; }
#film-subtitle { max-width: 80vw; padding: 10px 22px; border-radius: 10px;
  background: rgba(0, 0, 0, 0.55); color: #fff; font-size: 22px;
  line-height: 1.4; text-align: center; }
#cinema-close { position: absolute; top: 20px; right: 24px; width: 44px; height: 44px;
  border-radius: 50%; font-size: 18px; background: rgba(255, 255, 255, 0.15);
  color: #fff; padding: 0; }
```

- [ ] **Step 5: `src/main.js` 수정**

- `clips`/`useClips` 로직 제거 (playScene 옵션에서 clip 관련 분기 삭제 — 읽기 모드는 이미지 배경만 사용).
- 시네마 연결:

```js
import { createCinema } from './cinema.js'

const watchFilmBtn = document.getElementById('watch-film')
const cinema = createCinema(
  {
    root: document.getElementById('cinema'),
    video: document.getElementById('film-video'),
    subtitle: document.getElementById('film-subtitle'),
    closeBtn: document.getElementById('cinema-close'),
  },
  { onClose: () => stopBgm() },
)
```

- 업로드 핸들러에서 `onClip` 제거, 추가:

```js
      onFilm: (url) => {
        watchFilmBtn.classList.remove('hidden')
        watchFilmBtn.onclick = () => {
          currentEngine?.stop() // stop the reading-mode playback and its voices
          stopBgm()
          bgm = new Audio(encodeURI('/audio/gomtang s3.mp3'))
          bgm.loop = true
          bgm.volume = 0.12 // music under the film's native audio
          bgm.play?.()?.catch(() => {})
          cinema.open({ filmUrl: url, scene })
        }
      },
```

(참고: `bgm` 변수와 `startBgm`/`stopBgm`은 모듈 스코프 — 시네마용 낮은 볼륨 재생을 위해 위처럼 직접 구성하거나, `startBgm(volume = 0.25)`로 파라미터화해도 좋다. 파라미터화가 더 깔끔하면 그렇게.)

- 업로드 시작 시 `watchFilmBtn.classList.add('hidden')`으로 리셋 (기존 replay 리셋 라인 대체).

- [ ] **Step 6: 전체 테스트 + 문법 확인 후 Commit**

Run: `npm run test && node --check src/main.js src/cinema.js`

```bash
git add -A && git commit -m "feat: fullscreen cinema mode with subtitles for the continuous film"
```

---

## Task 5: E2E 수동 검증 (실 API)

- [ ] 서버+dev 기동 → 책 사진 업로드 → 확인:
  1. `Filming scene 1/4...` → `4/4...` 진행 라벨이 순차 표시 (읽기 모드는 그동안 정상 재생)
  2. 필름 완성 시 "🎬 Watch the film" 버튼 등장
  3. 클릭 → **풀스크린**: 한 편의 연속 영상(장면이 이어짐), 하단 자막이 세그먼트에 맞춰 전환, Veo 오디오 + 낮은 BGM, TTS 없음
  4. ✕ 닫기 → 오버레이 종료, 소리 정지
  5. 서버 로그·콘솔 에러 없음

---

## 완료 기준 (Definition of Done)
- `npm run test` 전부 통과.
- 업로드 → 읽기 모드(즉시) + 연속 필름(백그라운드) 생성.
- 시네마 모드: 풀스크린 연속 영상 + 자막 + 음악 중심 사운드.
- 필름 실패 시에도 읽기 모드 체험은 완결 (비치명적).
- 비트별 클립 코드 제거 (dead code 없음).
