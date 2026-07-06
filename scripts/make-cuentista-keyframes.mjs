// scripts/make-cuentista-keyframes.mjs
//
// INTERNAL PRODUCTION SCRIPT — regenerate/extend The Last Cuentista
// keyframes with Nano Banana Pro, loading the style from the images the
// author already approved: character sheets, the spacecraft design, and
// the good existing scene frames are ALL attached as references on every
// call (per direction: attach as many references as possible).
// Missing files only (resumable); delete a jpg to re-roll it.
//
// Usage: npm run make-cuentista-keyframes

import fs from 'node:fs'
import path from 'node:path'
import { defaultGenAi } from '../server/genai.js'
import { loadReferenceImages, sniffImageMime, PRO_MODEL, LITE_MODEL } from '../server/images.js'

const DIR = 'production/cuentista-keyframes'

// Every call attaches: the 8 public/images style references FIRST (they are
// the art-style law for the whole product), then the identity references
// (who/what to draw: the two children, the ship, the grandmothers) which
// must be REDRAWN in that style.
const STYLE_REF_COUNT = 8
const COLD_IDENTITY = ['petra.jpg', 'javier.jpg', 'spacecraft.jpg']
const WARM_IDENTITY = ['abuelas.jpg'] // the grandmothers exist only in the memory

const STYLE_RULES =
  `STYLE LOCK. The FIRST EIGHT attached images define the ONLY allowed art ` +
  `style: a quirky hand-drawn indie cartoon (webtoon / zine feel) — bold, ` +
  `wobbly black marker outlines with uneven, imperfect hand-drawn line ` +
  `weight; completely FLAT solid color fills with no gradients, no cel ` +
  `shading, no soft lighting; simple doodle-like characters with round ` +
  `faces, dot eyes or big sleepy oval eyes, zigzag hair silhouettes, thin ` +
  `limbs with small nub hands and feet; flat, naive-perspective backgrounds ` +
  `built from bold solid color planes; characters keep a white sticker-like ` +
  `cut-out outline, as if paper cutouts were pasted onto the scene. Do NOT ` +
  `drift toward anime, Disney, watercolor, pastel storybook, soft cel ` +
  `shading, 3D, or realism. The REMAINING attached images define only WHAT ` +
  `to draw — the teenage girl's identity (long dark wavy hair, earth-tone ` +
  `patched jacket, olive backpack), the younger boy's identity (grey ` +
  `hoodie, jeans, sneakers), the chrome-and-crystal praying-mantis ` +
  `spacecraft design — a mechanical, panelled, parked VEHICLE with NO wings ` +
  `and NO antennae, never a living insect — and the two grandmothers — ` +
  `REDRAW all of ` +
  `them in the style of the first eight images. Characters always have ` +
  `simple, correct anatomy — exactly two arms and two hands each. No ` +
  `floating letters, no readable text, no logos, no watermark. 16:9.`

const COLD_STYLE =
  STYLE_RULES +
  ` Palette for this shot: muted overcast teal-greens and grey-blues.`

const WARM_STYLE =
  STYLE_RULES +
  ` Palette for this shot: warm golden-hour amber, terracotta and honey ` +
  `tones (a cherished memory).`

const FRAMES = [
  {
    file: '1a-first.jpg',
    style: COLD_STYLE,
    prompt:
      `The two children seen from behind, walking side by side down a narrow ` +
      `dirt hiking trail deep inside a dense cedar forest: the girl with her ` +
      `olive backpack, the boy in his grey hoodie. Tall dark-green cartoon ` +
      `trees arch overhead; a bright opening of light waits at the far end of ` +
      `the trail. Dappled soft light on the path.`,
  },
  {
    file: '1a-last.jpg',
    style: COLD_STYLE,
    prompt:
      `The same two children from behind at the tree line, stepping out of ` +
      `the cedar forest into a wide open field of green grass. Across the ` +
      `field towers the enormous chrome-and-crystal praying-mantis spacecraft ` +
      `from the reference, dwarfing them; far away at the opposite end of the ` +
      `field a tiny identical twin spacecraft sits on the horizon, looking ` +
      `half the size. Overcast light.`,
  },
  {
    file: '2-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Close-up of the teenage girl's face with a distant, faraway gaze while ` +
      `she walks across the open green field, the grass and pale overcast ` +
      `horizon softly blurred behind her. Quiet, inward expression — she is ` +
      `somewhere else in her mind.`,
  },
  {
    file: '2-last.jpg',
    style: WARM_STYLE,
    prompt:
      `Two elderly Latina women under a red-and-black fringed blanket leaning ` +
      `shoulder to shoulder against a giant old pecan tree at golden hour, ` +
      `one pouring from a brown glass bottle into a clay mug, steam rising, ` +
      `clay mugs in hand. In the distance a mythic green SNAKE — a smooth, ` +
      `legless serpent with NO horns, NO whiskers, NO legs — glides gently ` +
      `home through the golden grass. Cozy and nostalgic.`,
  },
  {
    file: '3-last.jpg',
    style: COLD_STYLE,
    prompt:
      `High wide shot: a thin, orderly single line of people crosses the vast ` +
      `field of freshly cut green grass toward the enormous chrome-and-crystal ` +
      `praying-mantis spacecraft — and in that line, clearly recognizable, ` +
      `walk the teenage girl (olive backpack) holding hands with the younger ` +
      `boy (grey hoodie), together with a small family and a few scientists ` +
      `in white coats — NO elderly women anywhere in the line. The bright ` +
      `comet still streaks across the pale sky. ` +
      `Like ants on a march to their hole.`,
  },
  {
    file: '3-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Third-person medium shot: the teenage girl stands in the open green ` +
      `field looking up at the sky with a pained, resentful expression; the ` +
      `bright comet with its long luminous tail streaks across the pale ` +
      `overcast sky above her. Far behind her in the background, small in ` +
      `the distance, the enormous chrome-and-crystal praying-mantis ` +
      `spacecraft stands PARKED on the grass in side view, completely ` +
      `still. No one else in frame.`,
  },
  {
    file: 'javier-b2-last.jpg',
    style: COLD_STYLE,
    prompt:
      `Close shot from the boy's low angle, strict first person — the boy's ` +
      `BODY IS NOT IN FRAME, only his small hand (with a grey hoodie cuff) ` +
      `entering from the bottom edge to tighten around his sister's hand; ` +
      `above it, her quiet profile still ` +
      `gazing into the distance, a faint warm light touching her face as if a ` +
      `good memory passed through her. The green field soft behind them.`,
  },
  // ---- strict first-person keyframes (the character IS the camera) ----
  {
    file: 'p1-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the teenage girl's eyes, at her eye ` +
      `height: a narrow dirt hiking trail ahead, deep inside a dense cedar ` +
      `forest, a bright opening of light at the far end of the path. Her ` +
      `younger brother in his grey hoodie walks a step ahead at the edge of ` +
      `the frame beside her. The spacecraft is NOT visible at all — only ` +
      `forest, path, and light; the reveal comes later. The girl herself is ` +
      `NOT visible anywhere in the frame.`,
  },
  {
    file: 'p1-last.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the teenage girl's eyes at the tree ` +
      `line: the forest opens onto a vast field of green grass; the enormous ` +
      `chrome-and-crystal praying-mantis spacecraft towers across the field, ` +
      `PERFECTLY STILL like a parked machine; far on the horizon sits its tiny ` +
      `identical twin. At the bottom corner of the frame, her younger ` +
      `brother's small hand VISIBLY clenches her wrist (her arm in its ` +
      `patched earth-tone sleeve enters from the bottom edge). The girl ` +
      `herself is otherwise NOT visible.`,
  },
  {
    file: 'p2-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the teenage girl's eyes while walking ` +
      `across the open green field, her mind drifting elsewhere: the grass and ` +
      `the far-off walkers ahead have gone softly out of focus, dreamlike, the ` +
      `edges of the frame gently blurred as a memory rises. No people close to ` +
      `camera; the girl herself is NOT visible.`,
  },
  {
    file: 'p3-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the teenage girl's eyes, gazing up ` +
      `and ahead at the sky: the pale white-green comet with its long ` +
      `luminous tail blazes across the overcast sky, dominating the upper ` +
      `frame; a thin strip of the green field and horizon stays visible ` +
      `along the bottom of the frame, where the enormous chrome-and-crystal ` +
      `praying-mantis spacecraft stands PARKED far in the distance in side ` +
      `view, small against the horizon. ABSOLUTE RULE: zero people in the ` +
      `picture — no hair, no head, no shoulders, no back, no body parts, ` +
      `not even at the frame edges; she is the camera, never the subject.`,
  },
  {
    file: 'p3-last.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the teenage girl's eyes, back at ` +
      `ground level while walking: ahead of her a thin, quiet single line of ` +
      `walkers — ONLY one small family and a few scientists in white coats, ` +
      `NO elderly women anywhere — ` +
      `crosses the freshly cut grass toward the enormous PARKED mantis ` +
      `spacecraft in the middle distance; the comet still overhead. From ` +
      `the BOTTOM frame edge only, her own forearm in the patched ` +
      `earth-tone sleeve reaches down out of view, her little brother's ` +
      `small hand clasped in hers — exactly like a hand seen while looking ` +
      `down mid-stride. ABSOLUTE RULE: no other part of either child ` +
      `anywhere in the picture — no hair, no shoulder, no head, no back, ` +
      `no backpack, not even at the left or right frame edges; she is the ` +
      `camera, never the subject.`,
  },
  {
    file: 'j1-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the young boy's eyes at his lower, ` +
      `child-height eye level, skidding to a stop at the forest's edge: the ` +
      `green field opens ahead, and across it the enormous chrome-and-crystal ` +
      `praying-mantis spacecraft stands PARKED on the grass, still at a ` +
      `distance but already towering; the ground slightly tilted with the ` +
      `sudden halt, a little dust kicked up at the bottom edge; his own small ` +
      `hand shoots out to grab his sister's wrist — her arm in the patched ` +
      `earth-tone sleeve at the frame's edge. The boy himself is NOT visible.`,
  },
  {
    file: 'j1-last.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the young boy's eyes, craned steeply ` +
      `upward from a child's low height: the enormous chrome-and-crystal ` +
      `praying-mantis spacecraft fills the entire sky above, PERFECTLY STILL, ` +
      `a parked machine with no wings, seen from directly below so its tall ` +
      `legs converge upward. The foreground is ONLY empty grass. ABSOLUTE ` +
      `RULE: zero people in this image — no heads, no hair, no shoulders, ` +
      `no backs, no body parts of any kind. If any person appears the image ` +
      `is wrong. Just the parked machine and the sky from ground level.`,
  },
  {
    file: 'j2-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the young boy's eyes while walking, ` +
      `glancing sideways and up at his older sister beside him: she walks half ` +
      `a step ahead, gone completely quiet, her eyes far away toward the ` +
      `horizon; his small hand in hers at the bottom frame edge. The huge ` +
      `parked mantis ship stands soft and far in the haze. The boy himself is ` +
      `NOT visible.`,
  },
  {
    file: 'j3-first.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the young boy's low eyes inside the ` +
      `walking line: his sister's hand holding his at the bottom frame edge, ` +
      `her patched jacket beside him; ahead only the backs of one small family ` +
      `and a few scientists in white coats walking in a quiet single line on ` +
      `fresh-cut grass; the bright comet above. No elderly women anywhere. The ` +
      `boy himself is NOT visible.`,
  },
  {
    file: 'j3-last.jpg',
    style: COLD_STYLE,
    prompt:
      `Strict FIRST-PERSON view through the young boy's eyes standing at the ` +
      `foot of the ship, camera aimed STEEPLY UPWARD from ground level: the ` +
      `parked mantis spacecraft's chrome-and-crystal underside looms directly ` +
      `overhead in dramatic worm's-eye perspective, its legs converging up ` +
      `into the sky, one crystalline foot planted in the grass very near the ` +
      `camera. Perfectly still machine, NO wings, NO antennae. ABSOLUTE RULE: ` +
      `zero people in this image — no heads, no hair, no backs, no body ` +
      `parts of any kind. Just the machine overhead and the grass below.`,
  },
]

async function main() {
  const ai = defaultGenAi()
  if (!ai) throw new Error('GEMINI_API_KEY missing')
  const styleParts = loadReferenceImages().slice(0, STYLE_REF_COUNT).map((ref) => ({
    type: 'image',
    mime_type: ref.mimeType,
    data: ref.data,
  }))
  const loadIdentity = (names) =>
    names
      .filter((name) => fs.existsSync(path.join(DIR, name)))
      .map((name) => ({
        type: 'image',
        mime_type: 'image/jpeg',
        data: fs.readFileSync(path.join(DIR, name)).toString('base64'),
      }))
  const coldParts = [...styleParts, ...loadIdentity(COLD_IDENTITY)]
  const warmParts = [...styleParts, ...loadIdentity(WARM_IDENTITY)]
  console.log(`${coldParts.length} cold / ${warmParts.length} warm reference images per call`)

  let failures = 0
  for (const frame of FRAMES) {
    const out = path.join(DIR, frame.file)
    if (fs.existsSync(out)) {
      console.log(`skip ${frame.file} (exists — delete to re-roll)`)
      continue
    }
    console.log(`painting ${frame.file}...`)
    const generate = async (model) => {
      const interaction = await ai.interactions.create({
        model,
        input: [
          { type: 'text', text: `${frame.style}\n\n${frame.prompt}` },
          ...(frame.style === WARM_STYLE ? warmParts : coldParts),
        ],
        response_format: { type: 'image', aspect_ratio: '16:9' },
      })
      const data = interaction?.output_image?.data
      if (!data) throw new Error('no image data in response')
      return data
    }
    try {
      let data
      try {
        data = await generate(PRO_MODEL)
      } catch {
        data = await generate(LITE_MODEL)
      }
      void sniffImageMime(data)
      fs.writeFileSync(out, Buffer.from(data, 'base64'))
      console.log(`  ✓ ${frame.file}`)
    } catch (err) {
      failures += 1
      console.error(`  ✗ ${frame.file} failed:`, err?.message ?? err)
    }
  }
  console.log(`done — ${FRAMES.length - failures}/${FRAMES.length} frames`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
