// server/story.js

// Clamp free text to a prompt-friendly length (video prompts cap ~1024 tokens).
export function clampText(text, maxChars = 1500) {
  return text.length > maxChars ? `${text.slice(0, maxChars)}…` : text
}

// The full verbatim passage from the page — given to image/video models as
// story context so a generated moment fits its narrative (who, why, what
// came before), not just its one-line description.
export function passageText(scene, maxChars = 1500) {
  return clampText(scene.beats.map((beat) => beat.text).join(' '), maxChars)
}
