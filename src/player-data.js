// src/player-data.js
//
// Curated Imagination Player — STUDENT-FACING data only.
// The paragraph is split into three scenes, and every scene was pre-produced
// from three viewpoints (Felicity / Jonah / the World): a 3 x 3 grid of
// short films. Students watch and compare; they never generate anything.
// NOTE: internal generation prompts must never live in this file — it is
// bundled into the student page.

export const PASSAGE = {
  id: 'snicker-beedle-meeting',
  title: 'A Snicker of Magic',
  source: 'Natalie Lloyd',
  sceneTitle: 'The Boy at the Clean Table',
  text:
    'But the boy sitting at the bird-poopless table looked ... normal. He was ' +
    'reading the newspaper and twirling a red pen in his fingers. He had narrow ' +
    'shoulders and a head full of messy-spiky blond hair that reminded me of a ' +
    "crown. He didn't look at me.\n" +
    '"Pumpernickel?" I whispered.\n' +
    'The boy glanced up then. His eyes were the greenest green I\'d ever seen, ' +
    'like somebody had taken a neon marker and colored them in just before I ' +
    'walked up to him and called him a Beedle.',
}

// The three gazes — constant across every scene.
export const VIEWPOINTS = [
  { id: 'FELICITY', title: "Felicity's View", icon: '👧', color: '#e3a6c0' },
  { id: 'JONAH', title: "Jonah's View", icon: '👦', color: '#8fbf8f' },
  { id: 'WORLD', title: "The World's View", icon: '🌍', color: '#7ec8e3' },
]

// Three scenes x three viewpoints. Each view carries its own film and
// one-line interpretation; anchors and questions belong to the scene.
export const SCENES = [
  {
    id: 'table',
    icon: '🪑',
    title: 'The Clean Table',
    excerpt:
      'But the boy sitting at the bird-poopless table looked ... normal. He was ' +
      'reading the newspaper and twirling a red pen in his fingers.',
    anchorPhrases: [
      'bird-poopless table',
      'looked ... normal',
      'twirling a red pen',
    ],
    questions: [
      'Which detail tells you this table is different?',
      'Did the boy seem normal in every version?',
      'Who noticed whom first?',
    ],
    views: {
      FELICITY: {
        interpretation: "He looks so normal — so why can't I stop noticing him?",
        videoAssetUrl: '/curated/table-felicity.mp4',
        thumbnailUrl: '/curated/table-felicity.jpg',
      },
      JONAH: {
        interpretation: "Don't look up. She's coming closer.",
        videoAssetUrl: '/curated/table-jonah.mp4',
        thumbnailUrl: '/curated/table-jonah.jpg',
      },
      WORLD: {
        interpretation: 'The world keeps one table clean, and waits.',
        videoAssetUrl: '/curated/table-world.mp4',
        thumbnailUrl: '/curated/table-world.jpg',
      },
    },
  },
  {
    id: 'whisper',
    icon: '🤫',
    title: 'The Whisper',
    excerpt: 'He didn\'t look at me.\n"Pumpernickel?" I whispered.',
    anchorPhrases: ["He didn't look at me", '"Pumpernickel?"', 'I whispered'],
    questions: [
      'Why does she choose such a silly word?',
      'What does the stopped pen tell you?',
      'How loud is this moment, really?',
    ],
    views: {
      FELICITY: {
        interpretation: "It's a silly word — but it's the right key.",
        videoAssetUrl: '/curated/whisper-felicity.mp4',
        thumbnailUrl: '/curated/whisper-felicity.jpg',
      },
      JONAH: {
        interpretation: 'One word, and the pen forgets how to turn.',
        videoAssetUrl: '/curated/whisper-jonah.mp4',
        thumbnailUrl: '/curated/whisper-jonah.jpg',
      },
      WORLD: {
        interpretation: 'The whole courtyard holds its breath for one word.',
        videoAssetUrl: '/curated/whisper-world.mp4',
        thumbnailUrl: '/curated/whisper-world.jpg',
      },
    },
  },
  {
    id: 'glance',
    icon: '💚',
    title: 'The Green Glance',
    excerpt:
      "The boy glanced up then. His eyes were the greenest green I'd ever " +
      'seen, like somebody had taken a neon marker and colored them in just ' +
      'before I walked up to him and called him a Beedle.',
    anchorPhrases: ['glanced up', 'greenest green', 'neon marker', 'Beedle'],
    questions: [
      "What does 'the greenest green' feel like in each version?",
      'Is his look friendly, surprised, or something else?',
      'What changed the moment he looked up?',
    ],
    views: {
      FELICITY: {
        interpretation: "His eyes are the greenest green I've ever seen.",
        videoAssetUrl: '/curated/glance-felicity.mp4',
        thumbnailUrl: '/curated/glance-felicity.jpg',
      },
      JONAH: {
        interpretation: 'She said the word. Now she gets the real me.',
        videoAssetUrl: '/curated/glance-jonah.mp4',
        thumbnailUrl: '/curated/glance-jonah.jpg',
      },
      WORLD: {
        interpretation: 'When he looks up, the world repaints its greens.',
        videoAssetUrl: '/curated/glance-world.mp4',
        thumbnailUrl: '/curated/glance-world.jpg',
      },
    },
  },
]

// Shown under the videos — the comparison is the point.
export const COMPARE_QUESTIONS = [
  'Which version felt closest to the narrator?',
  'Which detail changed the most between the viewpoints?',
  'How did the viewpoint change your understanding of the paragraph?',
]
