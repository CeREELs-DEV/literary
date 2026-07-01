export function flash(stage, { color = '#fff', strength = 0.6, duration = 300 } = {}) {
  const layer = stage.querySelector('#flash-layer')
  if (!layer) return
  layer.style.background = color
  layer.style.transition = 'none'
  layer.style.opacity = String(strength)
  // fade out on the next frame
  requestAnimationFrame(() => {
    layer.style.transition = `opacity ${duration}ms ease-out`
    layer.style.opacity = '0'
  })
}
