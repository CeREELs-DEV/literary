export function showText(stage, { text = '', caption = '' } = {}) {
  const textEl = stage.querySelector('#beat-text')
  const capEl = stage.querySelector('#beat-caption')
  if (textEl) textEl.textContent = text
  if (capEl) capEl.textContent = caption
}
