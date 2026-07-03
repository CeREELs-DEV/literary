// tests/player.test.js
import { describe, it, expect } from 'vitest'
import { PASSAGE, SCENES, COMPARE_QUESTIONS } from '../src/player-data.js'
import { CURATED_SCENES, CURATED_STYLE } from '../scripts/curated-scenes.mjs'

describe('student-facing player data', () => {
  it('offers the three viewpoints on the sample paragraph', () => {
    expect(SCENES.map((s) => s.viewpoint)).toEqual(['FELICITY', 'JONAH', 'WORLD'])
  })

  it('gives every scene a title, a one-line interpretation, anchors, and 2-3 questions', () => {
    for (const scene of SCENES) {
      expect(scene.title).toBeTruthy()
      expect(scene.interpretation).toBeTruthy()
      expect(scene.interpretation).not.toContain('\n') // one line
      expect(scene.anchorPhrases.length).toBeGreaterThan(0)
      expect(scene.questions.length).toBeGreaterThanOrEqual(2)
      expect(scene.questions.length).toBeLessThanOrEqual(3)
      expect(scene.videoAssetUrl).toMatch(/^\/curated\/.+\.mp4$/)
    }
  })

  it('anchors point at phrases that exist in the passage', () => {
    for (const scene of SCENES) {
      for (const phrase of scene.anchorPhrases) {
        expect(PASSAGE.text).toContain(phrase)
      }
    }
  })

  it('NEVER ships generation internals to the student page', () => {
    for (const scene of SCENES) {
      const keys = Object.keys(scene).join(' ').toLowerCase()
      expect(keys).not.toContain('prompt')
      expect(keys).not.toContain('model')
      expect(keys).not.toContain('status')
    }
  })

  it('provides comparison questions — the comparison is the point', () => {
    expect(COMPARE_QUESTIONS.length).toBeGreaterThanOrEqual(2)
    for (const q of COMPARE_QUESTIONS) expect(q.endsWith('?')).toBe(true)
  })
})

describe('internal production data (makers only)', () => {
  it('has one internal Omni prompt per student scene, ids matching', () => {
    expect(CURATED_SCENES.map((s) => s.id).sort()).toEqual(
      SCENES.map((s) => s.id).sort(),
    )
    for (const scene of CURATED_SCENES) {
      expect(scene.internalOmniPrompt).toContain('8-second video')
      expect(['DRAFT', 'GENERATED', 'APPROVED']).toContain(scene.status)
    }
  })

  it('keeps every prompt inside the content guardrails', () => {
    for (const scene of CURATED_SCENES) {
      const text = `${CURATED_STYLE} ${scene.internalOmniPrompt}`.toLowerCase()
      expect(text).toContain('no floating letters')
      expect(text).toContain('no horror')
      for (const banned of ['glowing runes', 'floating words', 'grotesque monster']) {
        expect(text).not.toContain(banned)
      }
    }
  })

  it('each prompt covers exactly one viewpoint', () => {
    expect(CURATED_SCENES.find((s) => s.id === 'felicity-view').internalOmniPrompt)
      .toContain("FELICITY'S VIEW")
    expect(CURATED_SCENES.find((s) => s.id === 'jonah-view').internalOmniPrompt)
      .toContain("THE BOY'S VIEW")
    expect(CURATED_SCENES.find((s) => s.id === 'world-view').internalOmniPrompt)
      .toContain("THE WORLD'S VIEW")
  })
})
