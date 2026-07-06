// scripts/curated-scenes.mjs
//
// INTERNAL PRODUCTION DATA — makers/admins only.
// This module holds the Gemini Omni prompts used to pre-produce the
// Imagination Player videos: three scenes x three viewpoints = nine films.
// It is imported only by the production script (make-curated-videos.mjs)
// and by tests; it must NEVER be imported from src/ — students never see
// prompts, models, or generation UI.
//
// Prompt principles: one scene, one viewpoint per video; simple camera;
// ~8 seconds; children's magical-realism tone. Forbidden: floating letters,
// readable text, runes, glowing words, horror, grotesque imagery, insects,
// liquid from eyes.

// Shared style contract for all videos — the attached reference images
// are the law, and the law is repeated in words that MATCH them (an earlier
// draft said "soft storybook watercolor" and the model followed the words
// instead of the images).
export const CURATED_STYLE =
  `STYLE LOCK. Copy the art style of the attached reference images EXACTLY — ` +
  `they are the only style authority. Their actual style: a quirky ` +
  `hand-drawn indie cartoon (webtoon / zine feel) — bold, wobbly black ` +
  `marker outlines with uneven, imperfect hand-drawn line weight; completely ` +
  `FLAT solid color fills with no gradients, no painterly shading, no soft ` +
  `lighting; simple doodle-like characters with round faces, dot eyes or big ` +
  `sleepy oval eyes, zigzag hair silhouettes, thin limbs with small nub ` +
  `hands and feet; flat, naive-perspective backgrounds built from bold solid ` +
  `color planes; characters keep a white sticker-like cut-out outline, as if ` +
  `paper cutouts were pasted onto the scene. Do NOT drift toward anime, ` +
  `Disney, watercolor, pastel storybook, 3D, or realism. Characters always ` +
  `have simple, correct anatomy — exactly two arms and two hands each; no ` +
  `extra limbs, no merged or morphing body parts. Nothing may pop into ` +
  `existence mid-shot: no new objects, terrain, or characters appearing. ` +
  `Keep the camera work simple and gentle. No floating letters, no readable ` +
  `text, no runes, no glowing words. No horror, no grotesque imagery, no ` +
  `insects, no liquid coming from eyes. No subtitles, no logos, no watermark.`

// One world, nine films — the place and the two children must be identical
// everywhere; only the scene beat and the point of view change.
export const SCENE_BIBLE =
  `SCENE BIBLE — every video shows the SAME place and the SAME two children. ` +
  `Location: a small-town school courtyard in warm late-afternoon light; ` +
  `several weathered wooden lunch tables scattered with leaves and bird ` +
  `droppings; ONE perfectly clean table beneath a large tree. At the clean ` +
  `table sits the slim 12-year-old boy: narrow shoulders, messy spiky ` +
  `light-gold hair like a small crooked crown, vivid green eyes, plain pale ` +
  `shirt, a folded newspaper in one hand and a red pen twirling in the ` +
  `other; his mobility chair sits naturally beside the table, never the ` +
  `focus. His hair only RESEMBLES a crown — never draw an actual crown ` +
  `object on his head. The shy 12-year-old girl has brown shoulder-length ` +
  `hair, a simple blue dress, and canvas shoes. There are exactly TWO ` +
  `children in this story and no other people. The location, wardrobe, lighting, and ` +
  `layout are identical in every video — only the moment and the camera's ` +
  `point of view change.`

// Prepended when previously produced clips are attached as references.
export const CONTINUITY_NOTE =
  `The attached video clip(s) are OTHER SHOTS of this very story. Match them ` +
  `exactly: the same two children with the same faces and outfits, the same ` +
  `courtyard and clean table, the same afternoon light, the same art style. ` +
  `Nothing about the world may change — only the moment and the gaze.`

// status: DRAFT -> GENERATED -> APPROVED
export const CURATED_SCENES = [
  // ---- Scene 1: The Clean Table (noticing; no whisper, no glance yet) ----
  {
    id: 'table-felicity',
    scene: 'table',
    viewpoint: 'FELICITY',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE CLEAN TABLE — FELICITY'S VIEW. This ` +
      `is a strict FIRST-PERSON shot: the girl IS the camera, so she must NOT ` +
      `appear anywhere in the frame — no girl at all. The camera glides ` +
      `slowly forward across the courtyard at a child's eye height, passing ` +
      `messy bird-stained tables, and settles on the one strangely clean ` +
      `table under the big tree where the boy sits ON A WOODEN CHAIR reading ` +
      `his folded newspaper and twirling the red pen — his wheelchair is ` +
      `parked beside the table, empty, never the focus. He never looks ` +
      `toward the camera; sunlight catches ` +
      `his messy light-gold hair like a small crooked crown. Nothing else ` +
      `happens — the noticing IS the scene. Mood: curious, shy, quietly ` +
      `uncanny. Audio: distant schoolyard, soft footsteps, pen tapping.`,
  },
  {
    id: 'table-jonah',
    scene: 'table',
    viewpoint: 'JONAH',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE CLEAN TABLE — THE BOY'S VIEW. This is ` +
      `a strict FIRST-PERSON shot from where the boy sits: AT the clean table ` +
      `UNDER the big tree, looking OUTWARD across the courtyard. The tree is ` +
      `BEHIND the camera — no tree trunk in view, at most a few leaves ` +
      `overhanging the very top edge of the frame. In front of the camera ` +
      `there is NO table except a sliver of his own tabletop at the very ` +
      `bottom edge — no clean table, no empty chairs, no wheelchair, no boy ` +
      `anywhere in the frame. Visible of him: ONLY his two hands at the ` +
      `bottom edge, one holding the folded newspaper, one twirling the red ` +
      `pen. Beyond the newspaper: only the MESSY bird-stained tables of the ` +
      `courtyard and the girl in the blue dress, far off, slowing down as she ` +
      `notices his table. The pen twirls steadily, a little too steadily. ` +
      `Camera fixed. Mood: "don't look up — she's coming closer." Audio: ` +
      `paper rustle, distant courtyard, approaching footsteps.`,
  },
  {
    id: 'table-world',
    scene: 'table',
    viewpoint: 'WORLD',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE CLEAN TABLE — THE WORLD'S VIEW. A ` +
      `calm, high, wide shot of the whole courtyard, camera nearly still. ` +
      `Bird shadows drift across the messy tables but curve away from the one ` +
      `clean table beneath the tree, as if the world stepped around it. At ` +
      `that table the boy reads, small in the frame, red pen turning like the ` +
      `scene's small clock; at the courtyard's edge the girl begins to cross ` +
      `toward him. Mood: "the world keeps one table clean, and waits." ` +
      `Audio: wind, faint birdsong, leaves.`,
  },
  // ---- Scene 2: The Whisper ("Pumpernickel?") ----
  {
    id: 'whisper-felicity',
    scene: 'whisper',
    viewpoint: 'FELICITY',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE WHISPER — FELICITY'S VIEW. Her gaze, ` +
      `standing right in front of the clean table: the raised newspaper and ` +
      `the boy's spiky light-gold hair above it fill the frame; he does not ` +
      `look at her. His red pen twirls at the newspaper's edge. A beat of ` +
      `hesitation — then one soft whispered word, and the pen stops dead ` +
      `mid-turn. He still has not looked up. Camera fixed. Mood: nervous, ` +
      `comic, tender — a silly word used like a key. Audio: courtyard hush, ` +
      `one whispered word, sudden quiet.`,
  },
  {
    id: 'whisper-jonah',
    scene: 'whisper',
    viewpoint: 'JONAH',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE WHISPER — THE BOY'S VIEW. This is a ` +
      `strict FIRST-PERSON shot from his seat at the clean table: the boy IS ` +
      `the camera, so he must NOT appear in the frame — only his hands and ` +
      `the newsprint at the frame bottom, his fingers twirling the red pen at ` +
      `the edge. The girl is VERY CLOSE: she stands at the opposite edge of ` +
      `his table, barely an arm's length beyond the newspaper, leaning ` +
      `slightly over the table toward him — close enough that a whisper ` +
      `reaches. She is the ONLY person in the frame: this story has exactly ` +
      `two children, and the boy is the camera, so besides his hands there ` +
      `must be no other child or person anywhere. Her whispered word crosses ` +
      `the paper — his fingers freeze ` +
      `around the pen mid-turn; the newspaper lowers one centimeter, no more. ` +
      `Camera fixed. Mood: "one word, and the pen forgets how to turn." ` +
      `Audio: paper rustle, whisper, silence.`,
  },
  {
    id: 'whisper-world',
    scene: 'whisper',
    viewpoint: 'WORLD',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE WHISPER — THE WORLD'S VIEW. A calm ` +
      `medium shot from the side of the clean table: the girl stands RIGHT AT ` +
      `the table's edge, directly across from the boy, leaning slightly over ` +
      `the table toward his raised newspaper — whisper-close, almost touching ` +
      `distance. The red pen turns between them like the scene's small clock. ` +
      `She says one soft word — the pen stops, drifting leaves seem to pause, ` +
      `and the courtyard falls gently quiet all at once. Camera still. Mood: ` +
      `"the world goes quiet for one small word." Audio: wind fading out, a ` +
      `soft voice, calm.`,
  },
  // ---- Scene 3: The Green Glance ----
  {
    id: 'glance-felicity',
    scene: 'glance',
    viewpoint: 'FELICITY',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE GREEN GLANCE — FELICITY'S VIEW. A ` +
      `gentle close-up, her strict first-person gaze from where she stands at ` +
      `the opposite edge of his table: the girl herself is NOT in the frame. ` +
      `A sliver of the tabletop crosses the very bottom of the frame between ` +
      `the camera and the boy — he SITS at the table behind it, and lifts his ` +
      `head from the newspaper to look straight into the camera, slightly ` +
      `upward. His eyes are the greenest green — vivid and clear like fresh ` +
      `marker ink, yet warm and human, never glowing. As he looks up, the ` +
      `greens of the courtyard behind him (leaves, tree) quietly deepen one ` +
      `shade. Camera fixed with a very slow, slight push in. Mood: quiet ` +
      `astonishment. Audio: a held breath, paper flutter, a soft warm ` +
      `shimmer.`,
  },
  {
    id: 'glance-jonah',
    scene: 'glance',
    viewpoint: 'JONAH',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE GREEN GLANCE — THE BOY'S VIEW. This ` +
      `is a strict FIRST-PERSON shot from his seat at the clean table under ` +
      `the tree: the boy IS the camera, so no boy, no clean table, no empty ` +
      `chairs, and no wheelchair may appear in front of the camera — only a ` +
      `sliver of his own tabletop and his hands at the bottom edge. The ` +
      `newspaper lowers and the frame tilts gently up to the girl standing ` +
      `right at the opposite edge of his table — her astonished face catching ` +
      `the warm afternoon light, a faint green reflection passing across it. ` +
      `Behind her: only the messy courtyard tables. She finally sees him ` +
      `seeing her. Camera: one gentle tilt up, then still. Mood: "she said ` +
      `the word — now she gets the real me." Audio: paper lowering, a held ` +
      `breath, soft courtyard returning.`,
  },
  {
    id: 'glance-world',
    scene: 'glance',
    viewpoint: 'WORLD',
    status: 'GENERATED',
    internalOmniPrompt:
      `8-second video, 16:9. SCENE: THE GREEN GLANCE — THE WORLD'S VIEW. A ` +
      `calm medium-wide shot: the boy looks up from his newspaper at the girl ` +
      `before the clean table, and a soft wave of deeper green rolls quietly ` +
      `across the courtyard — grass, leaves, the big tree — as if the world ` +
      `repainted itself one shade more alive. The two children face each ` +
      `other at last. Camera still. Mood: "when he looks up, the world ` +
      `repaints its greens." Audio: wind through leaves, faint birdsong ` +
      `returning, warmth.`,
  },
]
