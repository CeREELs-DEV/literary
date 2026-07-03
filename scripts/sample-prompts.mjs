// scripts/sample-prompts.mjs
//
// Hand-designed GIF-card prompts for the pre-generated sample set:
// 3 beats x 5 versions (Original + 4 era remixes) = 15 short seamless loops.
// One visual idea per loop, fixed camera, small quiet movements — the scene
// is a moment of PERCEPTION, not action, so the symbols carry the meaning:
//   beat 1  the world's chance and mess skip one table (bird-poopless table)
//   beat 2  a red pen conducts the scene's rhythm and stops on a strange word
//   beat 3  green sharpens — the world is repainted when he looks up
// No floating words/runes/readable text; no heavy magic; no glowing-monster eyes.

export { COMMON_STYLE } from '../server/style.js'

// The three story moments every version renders, in order.
export const BEAT_KEYS = ['skipped-table', 'pen-stops', 'green-deepens']

// Short Korean captions shown under each card (same across versions —
// the symbolism does not change with the era).
export const CAPTIONS = [
  '세상의 우연이 그 아이 곁만 비켜 간다.',
  '이상한 단어 하나가 장면의 시간을 멈춘다.',
  '그가 고개를 든 순간, 세계의 초록이 다시 칠해진다.',
]

// dialogue: what the girl whispers in this version — swapped into the beat's
// spoken segment for TTS so voices match what the clip implies (null = keep
// the excerpt's original line).
export const VERSIONS = [
  {
    id: 'original',
    label: 'Original',
    dialogue: null,
    prompts: [
      `4-second seamless loop, 16:9, fixed camera. A quiet school courtyard with ` +
        `several outdoor lunch tables. Every table is messy with leaves, stains, and ` +
        `bird droppings — except one perfectly clean table, where a slim blond boy ` +
        `sits reading a newspaper. Slow bird shadows drift across the ground and the ` +
        `messy tables, but curve away from the clean table, never crossing it. The ` +
        `boy barely moves; only his newspaper sways slightly. Ordinary but quietly ` +
        `uncanny.`,
      `4-second seamless loop, 16:9, fixed close-up on a boy's hand above a folded ` +
        `newspaper on a clean outdoor table. A red pen twirls slowly between his ` +
        `fingers, twice, then stops dead. As it stops, sunlight catches the tips of ` +
        `his messy light-gold hair at the top of the frame, tracing a brief faint ` +
        `crown-like rim of light. Everything else is still.`,
      `4-second seamless loop, 16:9, fixed camera, gentle close-up. A slim blond ` +
        `boy lifts his head slightly from a newspaper and looks straight ahead. His ` +
        `green eyes do not glow — they simply come into sharper, clearer focus. The ` +
        `greens of the background (grass, leaves) grow subtly deeper and richer, and ` +
        `a very faint green tint passes across the shy brown-haired girl at the edge ` +
        `of the frame. Quiet wonder.`,
    ],
  },
  {
    id: 'joseon',
    label: 'Joseon Korea',
    dialogue: '검은 보리떡?',
    prompts: [
      `4-second seamless loop, 16:9, fixed camera. A Joseon-era village schoolyard ` +
        `beside a small seodang. Several low wooden platforms are messy with leaves, ` +
        `dust, and bird droppings — except one perfectly clean low table, where a ` +
        `slim boy in simple Joseon clothing sits reading a folded paper notice. Slow ` +
        `bird shadows drift across the yard but curve away from the clean table. ` +
        `Only the paper's edge trembles in the wind.`,
      `4-second seamless loop, 16:9, fixed close-up on a boy's hand above a folded ` +
        `paper notice on a clean low wooden table. A red-lacquered brush handle ` +
        `twirls slowly between his fingers, twice, then stops dead. As it stops, ` +
        `warm afternoon light catches the tips of his messy hair at the top of the ` +
        `frame, tracing a brief faint crown-like rim. Everything else is still.`,
      `4-second seamless loop, 16:9, fixed camera, gentle close-up. A slim boy in ` +
        `Joseon clothing lifts his head slightly from the paper and looks straight ` +
        `ahead. His jade-green eyes come into sharper, clearer focus without ` +
        `glowing. The greens around the yard — young leaves, moss on stones — grow ` +
        `subtly deeper, and a faint green tint passes across the shy girl in hanbok ` +
        `at the edge of the frame.`,
    ],
  },
  {
    id: 'medieval',
    label: 'Medieval Europe',
    dialogue: null,
    prompts: [
      `4-second seamless loop, 16:9, fixed camera. A medieval market corner beneath ` +
        `castle walls. Several rough wooden tables are messy with crumbs, straw, and ` +
        `bird droppings — except one perfectly clean long table, where a slim blond ` +
        `boy sits reading a folded parchment notice. Slow bird shadows drift across ` +
        `the cobblestones but curve away from the clean table. Only the parchment's ` +
        `corner lifts slightly.`,
      `4-second seamless loop, 16:9, fixed close-up on a boy's hand above a folded ` +
        `parchment on a clean wooden table. A red quill twirls slowly between his ` +
        `fingers, twice, then stops dead. As it stops, sunlight catches the tips of ` +
        `his messy light-gold hair at the top of the frame, a brief faint crown-like ` +
        `rim of light. Everything else is still.`,
      `4-second seamless loop, 16:9, fixed camera, gentle close-up. A slim blond ` +
        `boy lifts his head slightly from the parchment and looks straight ahead. ` +
        `His green eyes come into sharper, clearer focus without glowing. The greens ` +
        `nearby — ivy on the castle wall, market herbs — grow subtly deeper, and a ` +
        `faint green tint passes across the shy cloaked girl at the edge of the ` +
        `frame.`,
    ],
  },
  {
    id: 'k90s',
    label: '1990s Korea',
    dialogue: '펌퍼니클?',
    prompts: [
      `4-second seamless loop, 16:9, fixed camera. A 1990s Korean school snack shop ` +
        `street in warm late-afternoon light. Several plastic tables are messy with ` +
        `wrappers, dust, and bird droppings — except one unusually clean table, ` +
        `where a slim boy sits reading a sports newspaper. Slow bird shadows drift ` +
        `across the pavement but curve away from the clean table. Only steam from ` +
        `the snack shop drifts gently.`,
      `4-second seamless loop, 16:9, fixed close-up on a boy's hand above a folded ` +
        `sports newspaper on a clean plastic table. A red ballpoint pen twirls ` +
        `slowly between his fingers, twice, then clicks still. As it stops, late ` +
        `sunlight catches the tips of his messy light-gold hair at the top of the ` +
        `frame, a brief faint crown-like rim. Everything else is still.`,
      `4-second seamless loop, 16:9, fixed camera, gentle close-up. A slim boy in a ` +
        `1990s school uniform lifts his head slightly from the newspaper and looks ` +
        `straight ahead. His green eyes come into sharper, clearer focus without ` +
        `glowing. The greens nearby — a ginkgo tree, a painted shop sign — grow ` +
        `subtly deeper, and a faint green tint passes across the shy schoolgirl at ` +
        `the edge of the frame.`,
    ],
  },
  {
    id: 'space',
    label: 'Space Colony',
    dialogue: null,
    prompts: [
      `4-second seamless loop, 16:9, fixed camera. A cafeteria inside a glass ` +
        `habitat dome on a distant space colony. Most tables are smudged with fine ` +
        `mineral dust — except one perfectly clean table, where a slim blond boy ` +
        `sits reading a small holo-newspaper. Slow shadows of tiny pollinator ` +
        `drones drift across the floor but curve away from the clean table. Only ` +
        `the holo-page flickers softly.`,
      `4-second seamless loop, 16:9, fixed close-up on a boy's hand above a small ` +
        `holo-newspaper on a clean table. A red stylus twirls slowly between his ` +
        `fingers, twice, then freezes mid-turn. As it stops, dome light catches the ` +
        `tips of his messy light-gold hair at the top of the frame, a brief faint ` +
        `crown-like rim. Everything else is still.`,
      `4-second seamless loop, 16:9, fixed camera, gentle close-up. A slim blond ` +
        `boy in a light colony suit lifts his head slightly from the holo-newspaper ` +
        `and looks straight ahead. His green eyes come into sharper, clearer focus ` +
        `without glowing. The greens nearby — young plants in the dome's garden ` +
        `beds — grow subtly deeper, and a faint green tint passes across the shy ` +
        `girl at the edge of the frame.`,
    ],
  },
]
