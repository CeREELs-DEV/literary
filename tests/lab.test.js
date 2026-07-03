// tests/lab.test.js
import { describe, it, expect } from 'vitest'
import { PASSAGE, MISSIONS, DEVICES, LENSES, HYPOTHESES, CONSTRAINTS } from '../src/lab-data.js'
import { buildPrompt, defaultSelection, reflectionFor } from '../src/lab.js'

describe('lab data', () => {
  it('has the six missions for the sample passage', () => {
    expect(MISSIONS.map((m) => m.id)).toEqual([
      'exception', 'too-normal', 'red-pen', 'crooked-crown', 'wrong-key', 'green-signal',
    ])
  })

  it('anchors every mission phrase inside the passage text', () => {
    const anchored = PASSAGE.segments.filter((s) => s.mission).map((s) => s.mission)
    expect(anchored.sort()).toEqual(MISSIONS.map((m) => m.id).sort())
  })

  it('gives every mission a question, a mood, and all three hypotheses', () => {
    for (const mission of MISSIONS) {
      expect(mission.question).toBeTruthy()
      expect(mission.mood).toBeTruthy()
      for (const h of HYPOTHESES) expect(mission.scenes[h.id]).toBeTruthy()
      expect(DEVICES.some((d) => d.id === mission.device)).toBe(true)
      for (const lens of mission.lenses) {
        expect(LENSES.some((l) => l.id === lens)).toBe(true)
      }
    }
  })

  it('offers non-visual lenses (aphantasia-friendly)', () => {
    const ids = LENSES.map((l) => l.id)
    expect(ids).toEqual(expect.arrayContaining(['rule', 'sound', 'emotion', 'symbol', 'camera']))
  })
})

describe('defaultSelection', () => {
  it('starts from the mission suggestion and the literal hypothesis', () => {
    expect(defaultSelection('exception')).toEqual({
      mission: 'exception',
      device: 'personification',
      lens: 'rule',
      hypothesis: 'literal',
    })
  })

  it('returns null for an unknown mission', () => {
    expect(defaultSelection('nope')).toBeNull()
  })
})

describe('buildPrompt', () => {
  it('assembles phrase + device + lens + mood + constraints', () => {
    const prompt = buildPrompt(defaultSelection('exception'))
    expect(prompt).toContain('bird-poopless table') // anchor phrase
    expect(prompt).toContain('personification') // device
    expect(prompt).toContain('invisible rule') // rule lens clause
    expect(prompt).toContain('slightly uncanny') // mood
    expect(prompt).toContain(CONSTRAINTS) // visual guardrails
    expect(prompt).toContain('every outdoor table is messy') // literal scene
  })

  it('changes with the chosen lens', () => {
    const base = defaultSelection('red-pen')
    const sound = buildPrompt({ ...base, lens: 'sound' })
    const camera = buildPrompt({ ...base, lens: 'camera' })
    expect(sound).not.toEqual(camera)
    expect(sound).toContain('sound')
    expect(camera).toContain('point of view')
  })

  it('changes with the chosen hypothesis', () => {
    const base = defaultSelection('green-signal')
    const literal = buildPrompt({ ...base, hypothesis: 'literal' })
    const abstract = buildPrompt({ ...base, hypothesis: 'abstract' })
    expect(literal).toContain('green eyes clear and vivid')
    expect(abstract).toContain('single green tone deepens')
  })

  it('changes with the chosen device', () => {
    const base = defaultSelection('crooked-crown')
    const simile = buildPrompt({ ...base, device: 'simile' })
    const symbolism = buildPrompt({ ...base, device: 'symbolism' })
    expect(simile).toContain('comparison visible')
    expect(symbolism).toContain('idea behind it')
  })

  it('keeps every prompt free of forbidden effects', () => {
    for (const mission of MISSIONS) {
      for (const h of HYPOTHESES) {
        const prompt = buildPrompt({ ...defaultSelection(mission.id), hypothesis: h.id })
        expect(prompt).toContain('No obvious magic effects')
        expect(prompt.toLowerCase()).not.toContain('floating words')
        expect(prompt.toLowerCase()).not.toContain('glowing runes')
      }
    }
  })
})

describe('reflectionFor', () => {
  it('pairs the mission question with the defend step', () => {
    const reflection = reflectionFor('wrong-key')
    expect(reflection.question).toBe('How can a silly word open a serious moment?')
    expect(reflection.defend).toContain('Why did you see it this way?')
  })
})
