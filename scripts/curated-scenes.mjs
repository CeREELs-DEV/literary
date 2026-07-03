// scripts/curated-scenes.mjs
//
// INTERNAL PRODUCTION DATA — makers/admins only.
// This module holds the Gemini Omni prompts used to pre-produce the
// Imagination Player videos. It is imported only by the production script
// (make-curated-videos.mjs) and by tests; it must NEVER be imported from
// src/ — students never see prompts, models, or generation UI.
//
// Prompt principles: one viewpoint per video; the same paragraph, a different
// gaze; simple camera; ~8 seconds; children's magical-realism tone.
// Forbidden: floating letters, readable text, runes, glowing words, horror,
// grotesque imagery, insects, liquid from eyes.

// Shared style contract for all three videos.
export const CURATED_STYLE =
  `Use the 3 attached reference images as the art style source: warm ` +
  `magical-realism children's storybook animation, flat hand-drawn 2D style, ` +
  `clean linework, soft muted palette. The shy 12-year-old girl has brown ` +
  `hair; the slim 12-year-old boy has narrow shoulders, messy spiky ` +
  `light-gold hair like a small crooked crown, vivid green eyes, and a red ` +
  `pen. Keep the camera work simple and gentle. No floating letters, no ` +
  `readable text, no runes, no glowing words. No horror, no grotesque ` +
  `imagery, no insects, no liquid coming from eyes. No subtitles, no logos, ` +
  `no watermark.`

// status: DRAFT -> GENERATED -> APPROVED
export const CURATED_SCENES = [
  {
    id: 'felicity-view',
    viewpoint: 'FELICITY',
    status: 'DRAFT',
    internalOmniPrompt:
      `8-second video, 16:9. FELICITY'S VIEW — the whole shot is her gaze. ` +
      `The camera glides slowly forward across a school courtyard, like a ` +
      `nervous girl approaching: messy outdoor tables pass by, then the one ` +
      `strangely clean table where a slim blond boy reads a newspaper and ` +
      `twirls a red pen. He never looks at the camera. At the soft whisper of ` +
      `one word, the pen stops — the boy glances up straight into the camera, ` +
      `and his vivid green eyes make every green in the scene quietly deepen. ` +
      `Mood: curious, shy, "he looks so normal, so why can't I stop noticing ` +
      `him." Audio: distant schoolyard, held breath, a whispered word, hush.`,
  },
  {
    id: 'jonah-view',
    viewpoint: 'JONAH',
    status: 'DRAFT',
    internalOmniPrompt:
      `8-second video, 16:9. THE BOY'S VIEW — from behind his newspaper. The ` +
      `folded newspaper fills the lower edge of the frame; beyond it, a shy ` +
      `brown-haired girl slowly crosses the courtyard toward the camera. He ` +
      `pretends to read: his red pen twirls steadily in the corner of the ` +
      `frame, hiding the tension. Her shoes stop in front of the table. At ` +
      `her whispered word the pen freezes mid-turn; the newspaper lowers ` +
      `slightly as he begins to lift his gaze. Camera still, one gentle tilt ` +
      `up at the end. Mood: "he never looks up, but he already knows the ` +
      `scene is changing." Audio: paper rustle, approaching footsteps, ` +
      `whisper, silence.`,
  },
  {
    id: 'world-view',
    viewpoint: 'WORLD',
    status: 'DRAFT',
    internalOmniPrompt:
      `8-second video, 16:9. THE WORLD'S VIEW — a calm, high, wide shot of ` +
      `the whole school courtyard, camera nearly still. Bird shadows drift ` +
      `across messy tables but curve away from the one clean table, as if the ` +
      `world stepped around it. At that table a newspaper hides a boy's face; ` +
      `his red pen turns slowly, like the scene's small clock. A girl crosses ` +
      `the courtyard toward him. When she whispers, the pen stops, the ` +
      `newspaper lowers — and all the greens of the courtyard (grass, leaves) ` +
      `quietly deepen at once, the world's signal that something changed. ` +
      `Mood: "this meeting is an exception the world quietly prepared." ` +
      `Audio: wind, faint birdsong, a whisper, a hush across the yard.`,
  },
]
