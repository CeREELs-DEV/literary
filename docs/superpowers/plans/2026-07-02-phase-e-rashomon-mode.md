# Phase E — 라쇼몽 모드 (키 장면 세 가지 상상) Implementation Plan

**Goal:** 키 장면 하나를 "정답 시각화" 대신 **서로 다른 세 가지 상상**(시점·분위기·구도가 다른 해석)으로 생성해 연속 재생하고, 마지막에 "How did YOU imagine it?" 질문 카드로 마무리 — 상상의 다양성을 체험시키는 교육적 구조.

**Design:**
- 스키마: 최상위 `imaginings` (정확히 3개) — `{ title, perspective, illustrationPrompt, motionPrompt }`. 같은 키 장면(keyBeatIndex 비트의 원문)에 대한 서로 다른 해석. 시점(누구의 눈)·분위기·구도가 서로 확연히 달라야 함. 새로운 스토리 사실 발명 금지(해석만 다름).
- 이미지: `generateImaginingImages` — 상상별 일러스트 3장 (Pro, 실패 시 Lite 재시도), `imagining-image {index, src}` 이벤트.
- 영상: `generateImaginingFilms` — 상상별 8초 클립을 **순차** 생성(쿼터 배려), 개별 실패는 스킵(해당 상상은 일러스트로 폴백). lite 우선 + 쿼터 시 fast 폴백 유지. `imagining-film {index, url}` 이벤트, 진행 라벨 `Filming imagination k/3...`.
- 파이프라인: drawing 단계 = [비트 이미지 ∥ TTS ∥ 상상 이미지] 병렬 → animating 단계 = 상상 필름 순차. 기존 단일 `film` 이벤트 제거.
- 시네마: 플레이리스트 플레이어 — "Imagination k of 3 — {title}" 라벨, 영상 끝나면 다음 상상 자동 재생(영상 없으면 일러스트 6초), 마지막에 질문 카드("How did YOU imagine it? Close your eyes and picture your own version of this moment.") + Replay/Close.
- 읽기 모드는 변경 없음.

**Files:** `server/scene-schema.js`, `server/images.js`, `server/film.js`(재작성), `server/pipeline.js`, `src/upload.js`, `src/cinema.js`(재작성), `src/main.js`, `index.html`, `src/styles.css` + 대응 테스트 전부.

**Verification:** `npm run test` 전부 통과, 그 후 실 API E2E (상상 3개 생성·순차 재생·질문 카드).
