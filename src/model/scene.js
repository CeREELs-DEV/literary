export function validateScene(scene) {
  if (!scene || typeof scene.id !== 'string' || !scene.id) {
    throw new Error('scene.id must be a non-empty string')
  }
  if (typeof scene.title !== 'string') {
    throw new Error('scene.title must be a string')
  }
  if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
    throw new Error('scene.beats must be a non-empty array')
  }
  for (const beat of scene.beats) {
    if (typeof beat.text !== 'string') {
      throw new Error('beat.text must be a string')
    }
    if (typeof beat.duration !== 'number' || beat.duration <= 0) {
      throw new Error('beat.duration must be a positive number')
    }
    if (!Array.isArray(beat.effects)) {
      throw new Error('beat.effects must be an array')
    }
    for (const effect of beat.effects) {
      if (!effect || typeof effect.type !== 'string' || !effect.type) {
        throw new Error('effect.type must be a non-empty string')
      }
    }
  }
  return scene
}
