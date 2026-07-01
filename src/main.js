const startScreen = document.getElementById('start-screen')
const experienceScreen = document.getElementById('experience-screen')
const startBtn = document.getElementById('start-sample')

startBtn?.addEventListener('click', () => {
  startScreen.classList.add('hidden')
  experienceScreen.classList.remove('hidden')
})
