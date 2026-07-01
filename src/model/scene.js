export function validateScene(scene) {
  if (!scene || typeof scene.id !== 'string' || !scene.id) {
    throw new Error('scene.id는 비어 있지 않은 문자열이어야 합니다')
  }
  if (typeof scene.title !== 'string') {
    throw new Error('scene.title은 문자열이어야 합니다')
  }
  if (!Array.isArray(scene.beats) || scene.beats.length === 0) {
    throw new Error('scene.beats는 비어 있지 않은 배열이어야 합니다')
  }
  for (const beat of scene.beats) {
    if (typeof beat.text !== 'string') {
      throw new Error('beat.text는 문자열이어야 합니다')
    }
    if (typeof beat.duration !== 'number' || beat.duration <= 0) {
      throw new Error('beat.duration은 양수여야 합니다')
    }
    if (!Array.isArray(beat.effects)) {
      throw new Error('beat.effects는 배열이어야 합니다')
    }
    for (const effect of beat.effects) {
      if (!effect || typeof effect.type !== 'string' || !effect.type) {
        throw new Error('effect.type은 비어 있지 않은 문자열이어야 합니다')
      }
    }
  }
  return scene
}
