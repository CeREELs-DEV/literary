// src/lab.js
import { MISSIONS, DEVICES, LENSES, HYPOTHESES, CONSTRAINTS } from './lab-data.js'

export const findMission = (id) => MISSIONS.find((m) => m.id === id) ?? null
export const findDevice = (id) => DEVICES.find((d) => d.id === id) ?? null
export const findLens = (id) => LENSES.find((l) => l.id === id) ?? null

// A mission's starting selection: its suggested device, its first suggested
// lens, and the literal hypothesis (interpretation starts from the text).
export function defaultSelection(missionId) {
  const mission = findMission(missionId)
  if (!mission) return null
  return {
    mission: mission.id,
    device: mission.device,
    lens: mission.lenses[0],
    hypothesis: 'literal',
  }
}

// Build the image prompt from the student's choices:
// [phrase] + [literary device] + [imagination lens] + [mood] + [constraints].
// The prompt is an interpretation hypothesis, not an answer key.
export function buildPrompt({ mission: missionId, device: deviceId, lens: lensId, hypothesis }) {
  const mission = findMission(missionId)
  if (!mission) return ''
  const device = findDevice(deviceId) ?? findDevice(mission.device)
  const lens = findLens(lensId) ?? findLens(mission.lenses[0])
  const scene = mission.scenes[hypothesis] ?? mission.scenes.literal
  return (
    `Create an illustration of ${scene}. ` +
    `Interpret "${mission.phrase}" as ${device.label.toLowerCase()} — ${device.promptNote}. ` +
    `${lens.clause} ` +
    `Mood: ${mission.mood}. ${CONSTRAINTS}`
  )
}

// The reflection block shown with every prompt — the "defend" step.
export function reflectionFor(missionId) {
  const mission = findMission(missionId)
  if (!mission) return null
  return {
    question: mission.question,
    defend: 'Why did you see it this way? What in the sentence made you choose this image?',
  }
}

export { MISSIONS, DEVICES, LENSES, HYPOTHESES }
