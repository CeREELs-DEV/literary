export function shake(stage, { intensity = 'low', duration = 400 } = {}) {
  const cls = intensity === 'high' ? 'shake-high' : 'shake-low'
  stage.style.setProperty('--shake-dur', `${duration}ms`)
  stage.classList.add(cls)
  stage.addEventListener(
    'animationend',
    () => stage.classList.remove(cls),
    { once: true },
  )
}
