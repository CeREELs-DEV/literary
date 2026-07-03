// src/player-data.js
//
// Curated Imagination Player — STUDENT-FACING data only.
// The videos are produced ahead of time by the makers (see
// scripts/curated-scenes.mjs for the internal production data); students
// never generate anything — they watch, compare, and discuss.
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

// The same paragraph, imagined three ways. One video per viewpoint,
// pre-produced; a placeholder card appears while a video is not yet published.
export const SCENES = [
  {
    id: 'felicity-view',
    viewpoint: 'FELICITY',
    icon: '👧',
    color: '#e3a6c0',
    title: "Felicity's View",
    interpretation: "He looks so normal — so why can't I stop noticing him?",
    anchorPhrases: [
      'bird-poopless table',
      'twirling a red pen',
      '"Pumpernickel?"',
      'greenest green',
    ],
    videoAssetUrl: '/curated/felicity-view.mp4',
    thumbnailUrl: null,
    questions: [
      'Which detail does Felicity notice first?',
      'Did the boy seem normal in this version?',
      'What does the whisper feel like from her side?',
    ],
  },
  {
    id: 'jonah-view',
    viewpoint: 'JONAH',
    icon: '👦',
    color: '#8fbf8f',
    title: "Jonah's View",
    interpretation: 'He never looks up — but he already knows the scene is changing.',
    anchorPhrases: [
      "He didn't look at me",
      'twirling a red pen',
      '"Pumpernickel?"',
      'glanced up',
    ],
    videoAssetUrl: '/curated/jonah-view.mp4',
    thumbnailUrl: null,
    questions: [
      'What gives away that he noticed her?',
      'What does the red pen mean in this version?',
      "Why doesn't he look up right away?",
    ],
  },
  {
    id: 'world-view',
    viewpoint: 'WORLD',
    icon: '🌍',
    color: '#7ec8e3',
    title: "The World's View",
    interpretation:
      "This meeting isn't just theirs — the world quietly made an exception.",
    anchorPhrases: [
      'bird-poopless table',
      'reading the newspaper',
      'red pen',
      'greenest green',
    ],
    videoAssetUrl: '/curated/world-view.mp4',
    thumbnailUrl: null,
    questions: [
      'What does the world seem to protect?',
      'What is the red pen here — a pen, a clock, or something else?',
      "Which green means 'something changed'?",
    ],
  },
]

// Shown under the three videos — the comparison is the point.
export const COMPARE_QUESTIONS = [
  'Which version felt closest to the narrator?',
  'Which detail changed the most between the videos?',
  'How did the viewpoint change your understanding of the paragraph?',
]
