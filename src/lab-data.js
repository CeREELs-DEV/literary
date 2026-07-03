// src/lab-data.js
//
// Literary Image Lab — sample data for the A Snicker of Magic excerpt.
// The lab is a reading workflow, not an image machine: pick a phrase (Anchor),
// name the literary device, choose an imagination lens, compare image
// hypotheses, build a prompt, and defend the interpretation.

// The passage, split so each mission's anchor phrase is clickable in place.
export const PASSAGE = {
  title: 'A Snicker of Magic',
  sceneTitle: 'The Boy at the Clean Table',
  segments: [
    { text: 'But the boy sitting at the ' },
    { text: 'bird-poopless table', mission: 'exception' },
    { text: ' ' },
    { text: 'looked ... normal', mission: 'too-normal' },
    { text: '. He was reading the newspaper and ' },
    { text: 'twirling a red pen', mission: 'red-pen' },
    { text: ' in his fingers. He had narrow shoulders and a head full of messy-spiky blond ' },
    { text: 'hair that reminded me of a crown', mission: 'crooked-crown' },
    { text: ". He didn't look at me.\n" },
    { text: '"Pumpernickel?"', mission: 'wrong-key' },
    { text: ' I whispered.\nThe boy glanced up then. His eyes were the ' },
    { text: 'greenest green', mission: 'green-signal' },
    {
      text:
        " I'd ever seen, like somebody had taken a neon marker and colored them in " +
        'just before I walked up to him and called him a Beedle.',
    },
  ],
}

// Literary devices — the reader's toolbox. promptNote turns the device into
// an image instruction.
export const DEVICES = [
  { id: 'metaphor', label: 'Metaphor', hint: 'one thing pictured as truly being another', promptNote: 'paint what it becomes, not what it is' },
  { id: 'simile', label: 'Simile', hint: 'a comparison using "like" or "as"', promptNote: 'make the comparison visible inside the frame' },
  { id: 'personification', label: 'Personification', hint: 'a non-human thing acting like a person', promptNote: 'give the non-human thing quiet intention' },
  { id: 'hyperbole', label: 'Hyperbole', hint: 'an exaggeration stretched past reality', promptNote: 'let the exaggeration gently bend the scene' },
  { id: 'onomatopoeia', label: 'Onomatopoeia', hint: 'a word that sounds like its sound', promptNote: 'make the sound visible' },
  { id: 'symbolism', label: 'Symbolism', hint: 'an object standing for an idea', promptNote: 'let it stand for the idea behind it' },
  { id: 'contrast', label: 'Contrast', hint: 'two opposites placed side by side', promptNote: 'place the opposites side by side in one frame' },
]

// Imagination lenses — different ways to imagine, so students who don't
// "see pictures in their head" can work through rules, sound, emotion,
// symbols, or point of view instead.
export const LENSES = [
  { id: 'visual', label: 'Visual', question: 'How does it look?', clause: 'Focus on what the eye actually sees: shapes, light, and small details.' },
  { id: 'sound', label: 'Sound', question: 'What does it sound like?', clause: 'Let the image suggest its sound — show the visible trace of what we would hear.' },
  { id: 'rule', label: 'Rule', question: 'What strange rule is at work?', clause: 'Show a quiet, invisible rule at work — the strangeness comes from the rule, not from magic effects.' },
  { id: 'emotion', label: 'Emotion', question: 'What feeling changes?', clause: 'Let one clear feeling color the whole scene: light, posture, and distance carry the emotion.' },
  { id: 'symbol', label: 'Symbol', question: 'What does it stand for?', clause: 'Compose the image so the subject clearly stands for something bigger than itself.' },
  { id: 'camera', label: 'Camera', question: 'Where do we watch from?', clause: 'Choose a deliberate point of view — where the viewer stands changes what the moment means.' },
]

// Image hypotheses — the same sentence can honestly become very different
// pictures. None of them is "the answer".
export const HYPOTHESES = [
  { id: 'literal', label: 'Literal', blurb: 'what the sentence shows' },
  { id: 'metaphorical', label: 'Metaphorical', blurb: 'what the sentence means' },
  { id: 'abstract', label: 'Abstract', blurb: 'what the sentence feels like' },
]

// Visual guardrails appended to every prompt.
export const CONSTRAINTS =
  'Storybook illustration style. No obvious magic effects, no floating letters ' +
  'or readable text, no horror.'

// The six missions for this passage. scenes: one description per hypothesis.
export const MISSIONS = [
  {
    id: 'exception',
    title: 'The Exception',
    phrase: 'bird-poopless table',
    question: 'What if randomness avoided one table?',
    device: 'personification',
    lenses: ['rule', 'visual'],
    mood: 'warm, curious, slightly uncanny',
    scenes: {
      literal:
        'a quiet school courtyard where every outdoor table is messy — leaves, ' +
        'stains, bird droppings — except one perfectly clean table where a boy ' +
        'reads a newspaper',
      metaphorical:
        'a courtyard where the world itself seems to step around one table: ' +
        'falling leaves, shadows, and bird paths all curve away from the one ' +
        'clean spot',
      abstract:
        'a field of scattered specks and stains with one untouched circle of ' +
        'calm, its emptiness feeling deliberate',
    },
  },
  {
    id: 'too-normal',
    title: 'Too Normal',
    phrase: 'looked ... normal',
    question: 'Can someone feel strange because they look too normal?',
    device: 'contrast',
    lenses: ['emotion', 'visual'],
    mood: 'flat calm on the surface, faint unease underneath',
    scenes: {
      literal:
        'an ordinary boy reading a newspaper at a school table, so plain that ' +
        'nothing about him stands out at all',
      metaphorical:
        'a boy who is slightly too neat, too still, too average — like a picture ' +
        'placed into the scene rather than a person sitting in it',
      abstract:
        'a perfectly even pattern with one region that is somehow more even than ' +
        'the rest — normal turned strange by degree',
    },
  },
  {
    id: 'red-pen',
    title: 'The Red Pen',
    phrase: 'twirling a red pen',
    question: "Is the pen a toy, a clock, a compass, or a conductor's baton?",
    device: 'metaphor',
    lenses: ['sound', 'camera'],
    mood: 'small, rhythmic, hypnotic',
    scenes: {
      literal:
        "a close-up of a boy's fingers twirling a red pen over a folded newspaper",
      metaphorical:
        "a red pen turning like a compass needle or a conductor's baton, quietly " +
        'setting the rhythm of the whole courtyard',
      abstract:
        'a single red line spinning slow circles in a gray, papery space — the ' +
        'only moving thing, keeping time',
    },
  },
  {
    id: 'crooked-crown',
    title: 'The Crooked Crown',
    phrase: 'hair ... like a crown',
    question: 'What changes when messy hair becomes a crown?',
    device: 'simile',
    lenses: ['visual', 'symbol'],
    mood: 'gentle, secretly regal',
    scenes: {
      literal:
        'a boy with messy spiky blond hair catching the sunlight while he reads',
      metaphorical:
        'sunlight resting on messy blond hair so that, for one moment, it reads ' +
        'as a small crooked crown on an ordinary boy',
      abstract:
        'a rough, imperfect ring of warm gold hovering above the everyday gray ' +
        'of a school table',
    },
  },
  {
    id: 'wrong-key',
    title: 'The Wrong Key',
    phrase: '"Pumpernickel?"',
    question: 'How can a silly word open a serious moment?',
    device: 'symbolism',
    lenses: ['sound', 'rule'],
    mood: 'hushed, suspended, on the edge of something',
    scenes: {
      literal:
        'a girl whispering a single word to a boy who has not yet looked up from ' +
        'his newspaper',
      metaphorical:
        'a whispered word hanging in the air between two children like a small ' +
        'key turning in an invisible lock',
      abstract:
        'a quiet space where one soft ripple crosses the stillness and everything ' +
        'pauses to listen',
    },
  },
  {
    id: 'green-signal',
    title: 'The Green Signal',
    phrase: 'greenest green',
    question: 'What if green is not a color, but a signal that the world has changed?',
    device: 'hyperbole',
    lenses: ['visual', 'emotion'],
    mood: 'quiet astonishment',
    scenes: {
      literal:
        'a boy looking up from a newspaper, his green eyes clear and vivid in ' +
        'the afternoon light',
      metaphorical:
        'the moment a boy looks up and every green in the world — grass, leaves, ' +
        'his eyes — turns one notch more alive, as if repainted',
      abstract:
        'a muted scene where a single green tone deepens and spreads, changing ' +
        'the meaning of everything it touches',
    },
  },
]
