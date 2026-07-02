# Phase F — 상상 리믹스 e-book Implementation Plan

**Concept shift (사용자 확정):** 자동 라쇼몽/필름 대신, **e-book처럼 책 형태로 텍스트를 보여주고**, 아이가 **문장(비트)을 선택**하고 **시대·배경을 자유 입력**("난 1800년대 조선시대 스타일로 상상해보고 싶어")한 뒤 생성 버튼을 누르면 — **음악이 흐르는 움직이는 짤 카드**(스틸 + Ken Burns 모션 + BGM 루프)가 만들어진다. 그림체는 레퍼런스 유지, 시대 요소만 번안. 음악은 1곡 통일, 앱 내 감상.

**Removed:** Rashomon imaginings, Veo 필름, 시네마 플레이어 (Veo가 기본 경로에서 완전히 빠짐 — 쿼터 문제 소멸). 읽기 모드(비트 재생 + TTS)는 보조 버튼으로 유지.

**New flow:**
```
업로드 → scene 도착 즉시 e-book 뷰 렌더 (원문이 책 페이지처럼, 문장 단위 선택 가능)
→ 문장 탭 → 상상 패널: 프리셋 칩(Joseon Korea, Medieval Europe, 1990s...) + 자유 입력
→ [✨ Imagine] → POST /api/reimagine
   서버: Claude가 아이의 소원(어떤 언어든)을 {label, illustrationPrompt}로 구조화
        → Nano Banana Pro(Lite 폴백)가 레퍼런스 그림체 유지 + 시대 번안 스틸 생성
→ 짤 카드: 이미지(kenburns 루프) + 시대 라벨 + BGM — 갤러리에 누적, 같은 장면 비교
→ (배경에서 기존 파이프라인의 비트 이미지·TTS 계속 생성 → done 시 "▶ Play the reading experience" 버튼 활성화)
```

**Server:**
- `server/genai.js` — 공용 `defaultGenAi()` (pipeline과 reimagine 공유)
- `server/reimagine.js` — `reimaginePassage({text, sceneTitle, wish, client, ai, references})`:
  Claude(opus-4-8, adaptive, json_schema {label, illustrationPrompt}) → Nano Banana(Pro→Lite 재시도, 레퍼런스 ≤8장, "keep EXACTLY the reference art style; adapt only costumes/architecture/props") → `{label, src(dataURL)}`
- `server/app.js` — `POST /api/reimagine` (JSON in/out, 주입 가능)
- `server/pipeline.js` — 필름 단계 제거: drawing(비트 이미지 ∥ TTS) → animating(라벨만) → done
- `server/scene-schema.js` — `imaginings`/`keyBeatIndex`/`motionPrompt` 제거 (더 빠른 scene 응답)
- 삭제: `server/film.js`, `src/cinema.js` + 관련 테스트/UI

**Frontend:** e-book 뷰(#book, 비트=선택 가능한 passage), 상상 패널(칩+자유입력), 리믹스 갤러리(kenburns 카드), BGM은 첫 생성 시 시작. `src/remix.js` fetch 헬퍼. 모든 UI 텍스트 영어.

**Tests:** reimagine(TDD, 가짜 client/ai), app 라우트, remix 헬퍼, schema/pipeline/upload/images 갱신, film/cinema 테스트 삭제.
