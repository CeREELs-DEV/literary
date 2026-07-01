# Tier 1 — 샘플 체험 + 공통 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹에서 "비트 타임라인"을 재생해, 원문 텍스트 + 화면 흔들기 + 번쩍임 + 사운드 + 증폭 자막 + (선택) 내레이션으로 문학 장면을 오감 체험시키는 샘플 데모를 완성한다.

**Architecture:** 콘텐츠(비트 데이터) ↔ 타임라인 엔진(재생 순서/타이밍) ↔ 감각 효과 부품(DOM/오디오 연출)을 분리한다. 엔진은 시간에 맞춰 각 비트의 효과를 효과 레지스트리에 위임해 트리거한다. 이 공통 엔진·효과 부품은 이후 Tier 2(업로드)에서 그대로 재사용된다.

**Tech Stack:** Vanilla JS(ES 모듈) + Vite(개발 서버/번들) + Vitest(jsdom 환경 테스트). 프레임워크 없음.

**Scope note:** 이 플랜은 스펙의 **Tier 1 + 공통 엔진**만 다룬다. Tier 2(사진 업로드 → AI 파이프라인 → 산출물 스트리밍)는 별도 플랜(`2026-07-01-tier2-upload-pipeline.md`)에서 이 엔진 위에 얹는다. 실제 AI 생성 에셋(Veo 영상 등)이 준비되기 전에도 동작하도록, 이 플랜은 CSS/플레이스홀더 에셋으로 재생 가능한 샘플 장면을 만든다.

---

## File Structure

- `package.json` — 의존성/스크립트 (`dev`, `build`, `test`)
- `vite.config.js` — Vite + Vitest(jsdom) 설정
- `index.html` — 진입점, 시작 화면 + 체험 화면 컨테이너
- `src/main.js` — 앱 부트스트랩, 화면 전환(시작 → 체험)
- `src/model/scene.js` — 씬/비트 데이터 검증(`validateScene`)
- `src/effects/registry.js` — 효과 레지스트리(type → 함수) + `applyEffect`
- `src/effects/shake.js` — 화면 흔들림
- `src/effects/flash.js` — 번쩍임 오버레이
- `src/effects/text.js` — 원문/증폭 자막 표시
- `src/effects/media.js` — `playSound`, `playClip`, `showImage`, `narrate`
- `src/timeline/engine.js` — `createTimelineEngine`, 비트 순차 재생
- `src/scenes/sample.js` — 샘플 비트 타임라인(데이터)
- `src/styles.css` — 레이아웃 + 효과용 CSS
- `tests/model/scene.test.js`
- `tests/effects/registry.test.js`
- `tests/effects/shake.test.js`
- `tests/effects/text.test.js`
- `tests/timeline/engine.test.js`

각 파일은 하나의 책임만 가진다. 콘텐츠(`scenes/`), 재생(`timeline/`), 연출(`effects/`)이 분리되어 있어 Tier 2가 콘텐츠 소스만 바꿔 끼울 수 있다.

---

## Task 1: 프로젝트 스캐폴드 (Vite + Vitest)

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/styles.css`
- Create: `.gitignore`

- [ ] **Step 1: `.gitignore` 작성**

```
node_modules
dist
```

- [ ] **Step 2: `package.json` 작성**

```json
{
  "name": "literary-imagination-demo",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 3: `vite.config.js` 작성**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
})
```

- [ ] **Step 4: `index.html` 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>문학 상상력 데모</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <div id="app">
      <section id="start-screen" class="screen">
        <h1>문학 상상력 데모</h1>
        <button id="start-sample" type="button">샘플 체험 시작</button>
      </section>
      <section id="experience-screen" class="screen hidden">
        <div id="stage">
          <div id="clip-layer"></div>
          <div id="image-layer"></div>
          <div id="flash-layer"></div>
          <div id="text-layer">
            <p id="beat-text"></p>
            <p id="beat-caption"></p>
          </div>
        </div>
      </section>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: `src/styles.css` 작성**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, sans-serif; background: #0d0d12; color: #f5f5f5; }
.screen { min-height: 100vh; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 24px; }
.hidden { display: none; }
button { font-size: 20px; padding: 14px 28px; border: none; border-radius: 12px;
  background: #6c5ce7; color: #fff; cursor: pointer; }

#stage { position: relative; width: 90vw; max-width: 900px; height: 70vh;
  overflow: hidden; border-radius: 16px; background: #14141c; }
#stage > div { position: absolute; inset: 0; }
#clip-layer, #image-layer { background-size: cover; background-position: center; }
#flash-layer { pointer-events: none; opacity: 0; background: #fff; }
#text-layer { display: flex; flex-direction: column; justify-content: flex-end;
  padding: 32px; gap: 8px; }
#beat-text { font-size: 28px; line-height: 1.5; }
#beat-caption { font-size: 20px; color: #ffd479; font-style: italic; opacity: 0.9; }

/* 카메라 흔들림 */
@keyframes shake-low  { 10%,90% { transform: translate(-1px,0); } 50% { transform: translate(1px,1px); } }
@keyframes shake-high { 10%,90% { transform: translate(-6px,-4px); } 50% { transform: translate(8px,6px); } }
.shake-low  { animation: shake-low  var(--shake-dur,400ms) ease-in-out; }
.shake-high { animation: shake-high var(--shake-dur,600ms) ease-in-out; }
```

- [ ] **Step 6: `src/main.js` 임시 부트스트랩 작성**

```js
const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')

startBtn?.addEventListener('click', () => {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
})
```

- [ ] **Step 7: 의존성 설치 후 개발 서버/테스트 러너 동작 확인**

Run: `npm install && npm run test`
Expected: Vitest가 실행되어 "No test files found" (또는 0 tests) 로 정상 종료(에러 없이). 개발 서버는 `npm run dev`로 로컬 URL이 뜨는지 확인.

- [ ] **Step 8: Commit**

```bash
git add .
git commit -m "chore: scaffold vite + vitest demo project"
```

---

## Task 2: 씬/비트 데이터 검증 (`validateScene`)

**Files:**
- Create: `src/model/scene.js`
- Test: `tests/model/scene.test.js`

데이터 모델:
- `scene = { id: string, title: string, beats: Beat[] }`
- `beat = { text: string, amplifiedCaption?: string, duration: number, effects: Effect[], narration?: string }`
- `effect = { type: string, ...params }`

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/model/scene.test.js
import { describe, it, expect } from 'vitest'
import { validateScene } from '../../src/model/scene.js'

describe('validateScene', () => {
  const validScene = {
    id: 'sample',
    title: '샘플',
    beats: [
      { text: '문이 닫혔다.', duration: 1000, effects: [{ type: 'shake', intensity: 'high' }] },
    ],
  }

  it('유효한 씬은 그대로 반환한다', () => {
    expect(validateScene(validScene)).toEqual(validScene)
  })

  it('id가 없으면 던진다', () => {
    expect(() => validateScene({ ...validScene, id: undefined })).toThrow(/id/)
  })

  it('beats가 비어 있으면 던진다', () => {
    expect(() => validateScene({ ...validScene, beats: [] })).toThrow(/beats/)
  })

  it('beat.duration이 양수가 아니면 던진다', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 0, effects: [] }] }
    expect(() => validateScene(bad)).toThrow(/duration/)
  })

  it('effect.type이 없으면 던진다', () => {
    const bad = { ...validScene, beats: [{ text: 'x', duration: 100, effects: [{ intensity: 'high' }] }] }
    expect(() => validateScene(bad)).toThrow(/type/)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/model/scene.test.js`
Expected: FAIL — "validateScene is not a function" / 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

```js
// src/model/scene.js
export function validateScene(scene) {
  if (!scene || typeof scene.id !== 'string' || !scene.id) {
    throw new Error('scene.id는 비어 있지 않은 문자열이어야 합니다')
  }
  if (typeof scene.title !== 'string') {
    throw new Error('scene.title은 문자열이어야 합니다')
  }
  if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
    throw new Error('scene.beats는 비어 있지 않은 배열이어야 합니다')
  }
  for (const beat of scene.beats) {
    if (typeof beat.text !== 'string') {
      throw new Error('beat.text는 문자열이어야 합니다')
    }
    if (typeof beat.duration !== 'number' || beat.duration <= 0) {
      throw new Error('beat.duration은 양수여야 합니다')
    }
    if (!Array.isArray(beat.effects)) {
      throw new Error('beat.effects는 배열이어야 합니다')
    }
    for (const effect of beat.effects) {
      if (!effect || typeof effect.type !== 'string' || !effect.type) {
        throw new Error('effect.type은 비어 있지 않은 문자열이어야 합니다')
      }
    }
  }
  return scene
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/model/scene.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/model/scene.js tests/model/scene.test.js
git commit -m "feat: add scene/beat validation"
```

---

## Task 3: 화면 흔들림 효과 (`shake`)

**Files:**
- Create: `src/effects/shake.js`
- Test: `tests/effects/shake.test.js`

`shake(stage, { intensity, duration })`는 stage 요소에 `shake-low`/`shake-high` 클래스를 붙이고, `--shake-dur` 변수를 설정한 뒤 애니메이션 종료 시 클래스를 제거한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/effects/shake.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { shake } from '../../src/effects/shake.js'

describe('shake', () => {
  let stage
  beforeEach(() => {
    stage = document.createElement('div')
    document.body.appendChild(stage)
  })

  it('high 강도는 shake-high 클래스를 붙인다', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    expect(stage.classList.contains('shake-high')).toBe(true)
    expect(stage.style.getPropertyValue('--shake-dur')).toBe('600ms')
  })

  it('기본 강도는 shake-low 클래스를 붙인다', () => {
    shake(stage, {})
    expect(stage.classList.contains('shake-low')).toBe(true)
  })

  it('animationend 이후 클래스를 제거한다', () => {
    shake(stage, { intensity: 'high', duration: 600 })
    stage.dispatchEvent(new Event('animationend'))
    expect(stage.classList.contains('shake-high')).toBe(false)
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/effects/shake.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

```js
// src/effects/shake.js
export function shake(stage, { intensity = 'low', duration = 400 } = {}) {
  const cls = intensity === 'high' ? 'shake-high' : 'shake-low'
  stage.style.setProperty('--shake-dur', `${duration}ms`)
  stage.classList.add(cls)
  stage.addEventListener(
    'animationend',
    () => stage.classList.remove(cls),
    { once: true },
  )
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/effects/shake.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/effects/shake.js tests/effects/shake.test.js
git commit -m "feat: add screen shake effect"
```

---

## Task 4: 번쩍임 효과 (`flash`)

**Files:**
- Create: `src/effects/flash.js`

`flash(stage, { color, strength, duration })`는 `#flash-layer`에 색/투명도를 순간 적용했다가 되돌린다. `requestAnimationFrame`으로 되돌리므로 fake timer 대신 직접 상태만 검증한다.

- [ ] **Step 1: 최소 구현 작성** (이 효과는 시각 전용이라 별도 단위 테스트 없이 Task 6의 레지스트리 테스트에서 호출 여부로 검증한다)

```js
// src/effects/flash.js
export function flash(stage, { color = '#fff', strength = 0.6, duration = 300 } = {}) {
  const layer = stage.querySelector('#flash-layer')
  if (!layer) return
  layer.style.background = color
  layer.style.transition = 'none'
  layer.style.opacity = String(strength)
  // 다음 프레임에 페이드 아웃
  requestAnimationFrame(() => {
    layer.style.transition = `opacity ${duration}ms ease-out`
    layer.style.opacity = '0'
  })
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/effects/flash.js
git commit -m "feat: add flash effect"
```

---

## Task 5: 텍스트 표시 효과 (`showText`)

**Files:**
- Create: `src/effects/text.js`
- Test: `tests/effects/text.test.js`

`showText(stage, { text, caption })`는 `#beat-text`에 원문을, `#beat-caption`에 증폭 자막을 넣는다. caption이 없으면 비운다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/effects/text.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { showText } from '../../src/effects/text.js'

function makeStage() {
  const stage = document.createElement('div')
  stage.innerHTML = '<p id="beat-text"></p><p id="beat-caption"></p>'
  return stage
}

describe('showText', () => {
  let stage
  beforeEach(() => { stage = makeStage() })

  it('원문 텍스트를 표시한다', () => {
    showText(stage, { text: '문이 닫혔다.' })
    expect(stage.querySelector('#beat-text').textContent).toBe('문이 닫혔다.')
  })

  it('증폭 자막을 표시한다', () => {
    showText(stage, { text: '문이 닫혔다.', caption: '집 전체가 울렸다' })
    expect(stage.querySelector('#beat-caption').textContent).toBe('집 전체가 울렸다')
  })

  it('caption이 없으면 자막을 비운다', () => {
    stage.querySelector('#beat-caption').textContent = '이전 자막'
    showText(stage, { text: 'x' })
    expect(stage.querySelector('#beat-caption').textContent).toBe('')
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/effects/text.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

```js
// src/effects/text.js
export function showText(stage, { text = '', caption = '' } = {}) {
  const textEl = stage.querySelector('#beat-text')
  const capEl = stage.querySelector('#beat-caption')
  if (textEl) textEl.textContent = text
  if (capEl) capEl.textContent = caption
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/effects/text.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/effects/text.js tests/effects/text.test.js
git commit -m "feat: add text display effect"
```

---

## Task 6: 미디어 효과 (`playSound`, `playClip`, `showImage`, `narrate`)

**Files:**
- Create: `src/effects/media.js`

이 효과들은 브라우저 오디오/비디오/이미지에 의존한다. jsdom에서 재생은 no-op이므로 방어적으로 작성하고, 단위 테스트는 Task 7(레지스트리)에서 "호출되면 던지지 않는다" 수준으로 검증한다.

- [ ] **Step 1: 최소 구현 작성**

```js
// src/effects/media.js

// 진동음/효과음/배경음 재생. src는 정적 에셋 경로.
export function playSound(stage, { src, volume = 1 } = {}) {
  if (!src) return
  const audio = new Audio(src)
  audio.volume = volume
  audio.play?.().catch(() => {}) // 자동재생 차단 등은 조용히 무시
}

// 배경 영상 클립 재생 (Tier 1: 미리 만든 클립 / 없으면 배경색 유지)
export function playClip(stage, { src } = {}) {
  const layer = stage.querySelector('#clip-layer')
  if (!layer) return
  layer.innerHTML = ''
  if (!src) return
  const video = document.createElement('video')
  video.src = src
  video.autoplay = true
  video.muted = true
  video.loop = false
  video.style.width = '100%'
  video.style.height = '100%'
  video.style.objectFit = 'cover'
  layer.appendChild(video)
  video.play?.().catch(() => {})
}

// 정지 일러스트 표시 (Tier 2 프리뷰용)
export function showImage(stage, { src } = {}) {
  const layer = stage.querySelector('#image-layer')
  if (!layer) return
  layer.style.backgroundImage = src ? `url("${src}")` : 'none'
}

// 읽어주기 내레이션: 오디오 파일(src) 우선, 없으면 브라우저 SpeechSynthesis 폴백
export function narrate(stage, { src, text } = {}) {
  if (src) {
    const audio = new Audio(src)
    audio.play?.().catch(() => {})
    return
  }
  if (text && typeof speechSynthesis !== 'undefined') {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'ko-KR'
    speechSynthesis.speak(utter)
  }
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/effects/media.js
git commit -m "feat: add media effects (sound, clip, image, narration)"
```

---

## Task 7: 효과 레지스트리 (`registry`, `applyEffect`)

**Files:**
- Create: `src/effects/registry.js`
- Test: `tests/effects/registry.test.js`

`effectRegistry`는 `type` 문자열을 효과 함수에 매핑한다. `applyEffect(stage, effect)`는 `effect.type`으로 함수를 찾아 나머지 파라미터를 넘긴다. 미등록 type은 조용히 무시한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/effects/registry.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { applyEffect, effectRegistry } from '../../src/effects/registry.js'

function makeStage() {
  const stage = document.createElement('div')
  stage.innerHTML =
    '<div id="clip-layer"></div><div id="image-layer"></div>' +
    '<div id="flash-layer"></div><p id="beat-text"></p><p id="beat-caption"></p>'
  document.body.appendChild(stage)
  return stage
}

describe('effect registry', () => {
  let stage
  beforeEach(() => { stage = makeStage() })

  it('알려진 효과 type을 모두 함수로 등록한다', () => {
    for (const type of ['shake', 'flash', 'text', 'sound', 'clip', 'image', 'narrate']) {
      expect(typeof effectRegistry[type]).toBe('function')
    }
  })

  it('applyEffect가 text 효과를 실행한다', () => {
    applyEffect(stage, { type: 'text', text: '문이 닫혔다.' })
    expect(stage.querySelector('#beat-text').textContent).toBe('문이 닫혔다.')
  })

  it('applyEffect가 shake 효과를 실행한다', () => {
    applyEffect(stage, { type: 'shake', intensity: 'high', duration: 500 })
    expect(stage.classList.contains('shake-high')).toBe(true)
  })

  it('미등록 type은 던지지 않고 무시한다', () => {
    expect(() => applyEffect(stage, { type: 'unknown' })).not.toThrow()
  })

  it('sound/clip/image/narrate 호출은 던지지 않는다', () => {
    expect(() => applyEffect(stage, { type: 'sound', src: 'x.mp3' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'clip', src: 'x.mp4' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'image', src: 'x.png' })).not.toThrow()
    expect(() => applyEffect(stage, { type: 'narrate', text: '안녕' })).not.toThrow()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/effects/registry.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

```js
// src/effects/registry.js
import { shake } from './shake.js'
import { flash } from './flash.js'
import { showText } from './text.js'
import { playSound, playClip, showImage, narrate } from './media.js'

export const effectRegistry = {
  shake,
  flash,
  text: showText,
  sound: playSound,
  clip: playClip,
  image: showImage,
  narrate,
}

export function applyEffect(stage, effect) {
  const fn = effectRegistry[effect.type]
  if (!fn) return
  const { type, ...params } = effect
  fn(stage, params)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/effects/registry.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/effects/registry.js tests/effects/registry.test.js
git commit -m "feat: add effect registry and applyEffect"
```

---

## Task 8: 타임라인 엔진 (`createTimelineEngine`)

**Files:**
- Create: `src/timeline/engine.js`
- Test: `tests/timeline/engine.test.js`

`createTimelineEngine({ stage, apply })`를 만든다. `apply`는 `(stage, effect) => void` (기본값은 `applyEffect`). `engine.play(scene)`는 비트를 순서대로 재생한다: 각 비트마다 원문/증폭 자막을 `text` 효과로 먼저 적용하고, 이어 비트의 `effects`를 적용한 뒤, `beat.duration`만큼 기다렸다가 다음 비트로. narration이 있으면 `narrate` 효과도 적용. 모든 비트가 끝나면 resolve.

테스트는 `vi.useFakeTimers()`와 mock `apply`로 결정적으로 검증한다.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
// tests/timeline/engine.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTimelineEngine } from '../../src/timeline/engine.js'

describe('createTimelineEngine', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const scene = {
    id: 's', title: 't',
    beats: [
      { text: 'A', amplifiedCaption: 'AA', duration: 1000,
        effects: [{ type: 'shake', intensity: 'high' }], narration: 'A' },
      { text: 'B', duration: 500, effects: [] },
    ],
  }

  it('첫 비트에서 text/shake/narrate 효과를 적용한다', () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply })
    engine.play(scene)
    const types = apply.mock.calls.map((c) => c[1].type)
    expect(types).toContain('text')
    expect(types).toContain('shake')
    expect(types).toContain('narrate')
    // text 효과에 원문과 증폭 자막이 실려 있다
    const textCall = apply.mock.calls.find((c) => c[1].type === 'text')
    expect(textCall[1].text).toBe('A')
    expect(textCall[1].caption).toBe('AA')
  })

  it('duration이 지나야 다음 비트로 넘어간다', () => {
    const apply = vi.fn()
    const engine = createTimelineEngine({ stage: {}, apply })
    engine.play(scene)
    apply.mockClear()
    // 아직 1000ms 안 지남 → B 비트 미적용
    vi.advanceTimersByTime(999)
    expect(apply.mock.calls.find((c) => c[1].text === 'B')).toBeUndefined()
    // 1000ms 경과 → B 비트 적용
    vi.advanceTimersByTime(1)
    const bText = apply.mock.calls.find((c) => c[1].type === 'text' && c[1].text === 'B')
    expect(bText).toBeTruthy()
  })

  it('모든 비트 종료 후 play 프로미스가 resolve된다', async () => {
    const engine = createTimelineEngine({ stage: {}, apply: vi.fn() })
    const done = engine.play(scene)
    await vi.advanceTimersByTimeAsync(1500)
    await expect(done).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run tests/timeline/engine.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

```js
// src/timeline/engine.js
import { applyEffect } from '../effects/registry.js'

export function createTimelineEngine({ stage, apply = applyEffect } = {}) {
  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function play(scene) {
    for (const beat of scene.beats) {
      // 1) 원문 + 증폭 자막
      apply(stage, { type: 'text', text: beat.text, caption: beat.amplifiedCaption ?? '' })
      // 2) 비트에 정의된 감각 효과
      for (const effect of beat.effects) {
        apply(stage, effect)
      }
      // 3) (선택) 내레이션
      if (beat.narration) {
        apply(stage, { type: 'narrate', text: beat.narration })
      }
      // 4) 비트 지속시간 대기
      await delay(beat.duration)
    }
  }

  return { play }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run tests/timeline/engine.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/timeline/engine.js tests/timeline/engine.test.js
git commit -m "feat: add timeline engine"
```

---

## Task 9: 샘플 장면 데이터 (`sample.js`)

**Files:**
- Create: `src/scenes/sample.js`

실제 AI 에셋(Veo 영상, 사운드)이 준비되기 전에도 재생되도록, 사운드/클립 `src`는 나중에 채울 자리로 두되 **효과 자체(흔들기·번쩍·자막·내레이션)는 즉시 동작**하도록 구성한다. 이 파일은 `validateScene`을 통과해야 한다. (실제 책 텍스트/에셋 확보 후 이 데이터만 교체한다.)

- [ ] **Step 1: 샘플 데이터 작성**

```js
// src/scenes/sample.js
export const sampleScene = {
  id: 'windy-door',
  title: '바람 부는 날',
  beats: [
    {
      text: '바람이 거세게 불었다.',
      amplifiedCaption: '나뭇가지가 휘청이고 창문이 덜컹였다',
      duration: 3000,
      narration: '바람이 거세게 불었다.',
      effects: [
        { type: 'clip', src: '' },              // TODO(asset): 바람 장면 영상
        { type: 'sound', src: '', volume: 0.6 }, // TODO(asset): 바람 소리
        { type: 'shake', intensity: 'low', duration: 800 },
      ],
    },
    {
      text: '문이 닫혔다.',
      amplifiedCaption: '집 전체가 쿵 하고 울렸다',
      duration: 3000,
      narration: '문이 닫혔다.',
      effects: [
        { type: 'image', src: '' },             // TODO(asset): 문 닫힌 그림
        { type: 'flash', color: '#000', strength: 0.25, duration: 250 },
        { type: 'shake', intensity: 'high', duration: 600 },
        { type: 'sound', src: '' },             // TODO(asset): 문 쾅 + 낮은 진동음
      ],
    },
    {
      text: '그리고 사방이 고요해졌다.',
      amplifiedCaption: '바람 소리마저 멀어지고, 숨소리만 남았다',
      duration: 3000,
      narration: '그리고 사방이 고요해졌다.',
      effects: [],
    },
  ],
}
```

> 참고: `src: ''`인 미디어 효과는 Task 6 구현에서 조용히 no-op이므로, 에셋이 없어도 데모는 흔들림·번쩍임·자막·내레이션으로 정상 재생된다. `TODO(asset)` 주석 위치에 실제 파일 경로를 채우면 완성된다.

- [ ] **Step 2: 검증 통과 확인 (일회성 스크립트)**

Run:
```bash
node --input-type=module -e "import('./src/scenes/sample.js').then(async ({sampleScene})=>{const {validateScene}=await import('./src/model/scene.js');validateScene(sampleScene);console.log('valid')})"
```
Expected: `valid` 출력 (검증 에러 없음).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/sample.js
git commit -m "feat: add sample scene data"
```

---

## Task 10: 앱 연결 — 샘플 체험 재생

**Files:**
- Modify: `src/main.js` (Task 1의 임시 버전을 전체 교체)

시작 버튼을 누르면 체험 화면으로 전환하고, 샘플 씬을 검증한 뒤 타임라인 엔진으로 재생한다.

- [ ] **Step 1: `src/main.js` 전체 교체**

```js
// src/main.js
import { validateScene } from './model/scene.js'
import { createTimelineEngine } from './timeline/engine.js'
import { sampleScene } from './scenes/sample.js'

const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')
const stage = document.getElementById('stage')

startBtn?.addEventListener('click', async () => {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')

  const scene = validateScene(sampleScene)
  const engine = createTimelineEngine({ stage })
  await engine.play(scene)
})
```

- [ ] **Step 2: 전체 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 모든 테스트(scene, shake, text, registry, engine) 통과.

- [ ] **Step 3: 개발 서버에서 수동 확인**

Run: `npm run dev` 후 브라우저에서 로컬 URL 열기.
Expected: "샘플 체험 시작" 클릭 → 체험 화면 전환 → 비트별로 원문/증폭 자막이 바뀌고, 2번째 비트에서 화면이 크게 흔들리며 번쩍임 → 마지막 비트에서 고요한 문구. (내레이션은 브라우저 SpeechSynthesis로 한국어 낭독; 브라우저 음성 지원 여부에 따라 다름.)

- [ ] **Step 4: Commit**

```bash
git add src/main.js
git commit -m "feat: wire sample experience playback"
```

---

## 완료 기준 (Definition of Done)
- `npm run test`가 전부 통과한다.
- `npm run dev`에서 "샘플 체험 시작"으로 비트 타임라인이 재생되고, 흔들림·번쩍임·자막·내레이션이 동작한다.
- 콘텐츠(`src/scenes/sample.js`)와 엔진/효과가 분리되어, 실제 AI 에셋 경로만 채우면 완성된다.
- 공통 엔진(`timeline/engine.js`)과 효과 부품(`effects/`)이 Tier 2에서 재사용 가능한 형태로 존재한다.

## 다음 플랜 (별도)
- **Tier 2 — 사진 업로드 파이프라인**: 가벼운 백엔드(키 보호) + Claude vision(이미지→원문+비트) + 이미지/영상 생성(Nano Banana/Veo) + ElevenLabs/Suno(사운드·내레이션) + 산출물 SSE 스트리밍. 이 플랜의 `createTimelineEngine`/`effectRegistry`/`validateScene`를 그대로 재사용하고, 콘텐츠 소스만 "Claude가 생성한 씬"으로 교체한다.
