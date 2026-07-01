import { shake } from './shake.js'
import { flash } from './flash.js'
import { showText } from './text.js'
import { playSound, playClip, showImage, narrate } from './media.js'

export const effectRegistry = {
  shake,
  flash,
  text: showText,
  sound: playSound,
  clip: playClip,
  image: showImage,
  narrate,
}

export function applyEffect(stage, effect) {
  const fn = effectRegistry[effect.type]
  if (!fn) return
  const { type, ...params } = effect
  fn(stage, params)
}
