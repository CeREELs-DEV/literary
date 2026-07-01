export function flash(stage, { color = '#fff', strength = 0.6, duration = 300 } = {}) {
  const layer = stage.querySelector('#flash-layer')
  if (!layer) return
  layer.style.background = color
  layer.style.transition = 'none'
  layer.style.opacity = String(strength)
  // 다음 프레임에 페이드 아웃
  requestAnimationFrame(() => {
    layer.style.transition = `opacity ${duration}ms ease-out`
    layer.style.opacity = '0'
  })
}
