// server/style.js

// The shared style contract for every generated video — sample clips and live
// wish-transforms alike — so all clips feel drawn for the same series.
// Authored by hand alongside the sample prompts in scripts/sample-prompts.mjs.
export const COMMON_STYLE =
  `Use the 8 provided reference images as the primary visual style references. ` +
  `Match their overall art direction, character proportions, line quality, color ` +
  `palette, background texture, lighting mood, and magical effect style. Do not ` +
  `copy any exact composition from the reference images; create a new original ` +
  `scene that feels like it belongs in the same visual universe.\n\n` +
  `Keep the same shy 12-year-old girl protagonist and the same slim 12-year-old ` +
  `boy across all clips. The boy has narrow shoulders, messy spiky light-gold ` +
  `hair that feels like a small crooked crown, vivid green eyes, and a red ` +
  `writing tool. His wheelchair or mobility chair may be visible naturally, but ` +
  `it should not be the focus of the scene.\n\n` +
  `Animated cinematic storybook style, warm magical realism, soft expressive ` +
  `character acting, gentle camera movement. Magical word effects should appear ` +
  `as abstract glowing handwritten strokes, not readable text.\n\n` +
  `No subtitles, no captions, no logos, no watermark, no readable on-screen text.`
