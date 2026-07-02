// server/book.js

// English "book bible" digest for generation prompts — canon facts, characters,
// and visual identity of the demo's preset book. Distilled from the full guide
// at docs/book/a-snicker-of-magic-guide.md; keep this compact (prompt budget).
export const BOOK_TITLE = 'A Snicker of Magic'

// Veo's safety filter blocks prompts containing person-like proper names
// ("real people's names or likenesses"). For VIDEO prompts only, character
// names are replaced with these visual descriptors (longest match first).
export const CHARACTER_DESCRIPTORS = [
  ['Felicity Juniper Pickle', 'the brown-haired girl'],
  ['Jonah Pickett', 'the boy in the electric wheelchair'],
  ['Day Grissom', 'the bearded bus driver'],
  ['Oliver Weatherly', 'the elderly man'],
  ['Stone Weatherly', 'the guitar-playing brother'],
  ['Berry Weatherly', 'the banjo-playing brother'],
  ['Frannie Jo', 'the little sister'],
  ['Aunt Cleo', 'the aunt'],
  ['the Beedle', 'the secret helper'],
  ['Felicity', 'the brown-haired girl'],
  ['Jonah', 'the boy in the wheelchair'],
  ['Grissom', 'the bus driver'],
  ['Beedle', 'the secret helper'],
  ['Holly', 'the mother'],
  ['Mama', 'the mother'],
  ['Cleo', 'the aunt'],
  ['Boone', 'the uncle'],
  ['Biscuit', 'the dog'],
]

// Strip character names from text bound for a video prompt.
export function stripCharacterNames(text) {
  let out = text
  for (const [name, descriptor] of CHARACTER_DESCRIPTORS) {
    out = out.split(name).join(descriptor)
  }
  return out
}

export const BOOK_CONTEXT =
  `"A Snicker of Magic" by Natalie Lloyd — a warm magical-realism children's novel set in ` +
  `Midnight Gulch, Tennessee: a small Appalachian town once famous for magic, where only ` +
  `traces of it remain. ` +
  `Characters: Felicity Juniper Pickle ("Flea"), 12, the shy narrator — a word collector ` +
  `who SEES glowing handwritten words floating in the air around people and places; she ` +
  `longs for a real home after years of wandering. Jonah Pickett, 12, her kind first ` +
  `friend, secretly "the Beedle" who helps townsfolk; he uses an electric wheelchair and ` +
  `has the "know-how" to sense what people need. Holly "Mama" Pickle, their loving but ` +
  `restless painter mother with a wandering heart. Frannie Jo, Felicity's little sister. ` +
  `Biscuit, the family dog. Aunt Cleo, the gruff quilt-making aunt. Uncle Boone, a ` +
  `banjo-playing musician with broken dreams. The Weatherly Brothers — Stone (guitar) and ` +
  `Berry (banjo) — legendary duelling musicians whose quarrel drained the town's magic ` +
  `and left a family curse of wandering. Oliver Weatherly, the elderly keeper of the ` +
  `town's magical memory (his ice cream stirs old memories). ` +
  `Visual identity: luminous handwritten words drifting around Felicity; cozy, slightly ` +
  `faded small-town streets in gentle Appalachian light; memory-stirring ice cream; old ` +
  `guitars and banjos; quilts. Tone: warm, bittersweet, hopeful.`
