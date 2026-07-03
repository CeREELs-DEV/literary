// tests/player.test.js
import { describe, it, expect } from 'vitest'
import {
  PASSAGE, SCENES, VIEWPOINTS, COMPARE_QUESTIONS,
} from '../src/player-data.js'
import {
  CURATED_SCENES, CURATED_STYLE, SCENE_BIBLE,
} from '../scripts/curated-scenes.mjs'

describe('student-facing player data (3 scenes x 3 viewpoints)', () => {
  it('offers three scenes and three constant viewpoints', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['table', 'whisper', 'glance'])
    expect(VIEWPOINTS.map((v) => v.id)).toEqual(['FELICITY', 'JONAH', 'WORLD'])
  })

  it('every scene has all three views, each with a film and a one-line interpretation', () => {
    for (const scene of SCENES) {
      expect(scene.excerpt).toBeTruthy()
      expect(scene.anchorPhrases.length).toBeGreaterThan(0)
      expect(scene.questions.length).toBeGreaterThanOrEqual(2)
      expect(scene.questions.length).toBeLessThanOrEqual(3)
      for (const viewpoint of VIEWPOINTS) {
        const view = scene.views[viewpoint.id]
        expect(view).toBeTruthy()
        expect(view.interpretation).toBeTruthy()
        expect(view.interpretation).not.toContain('\n') // one line
        expect(view.videoAssetUrl).toBe(`/curated/${scene.id}-${viewpoint.id.toLowerCase()}.mp4`)
        expect(view.thumbnailUrl).toBe(`/curated/${scene.id}-${viewpoint.id.toLowerCase()}.jpg`)
      }
    }
  })

  it('scene excerpts and anchors come from the passage itself', () => {
    for (const scene of SCENES) {
      for (const phrase of scene.anchorPhrases) {
        expect(PASSAGE.text).toContain(phrase)
      }
      // the excerpt is verbatim passage text (whitespace aside)
      expect(PASSAGE.text.replace(/\s+/g, ' ')).toContain(
        scene.excerpt.replace(/\s+/g, ' ').slice(0, 60),
      )
    }
  })

  it('NEVER ships generation internals to the student page', () => {
    for (const scene of SCENES) {
      const keys = [
        ...Object.keys(scene),
        ...Object.values(scene.views).flatMap((v) => Object.keys(v)),
      ].join(' ').toLowerCase()
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
  it('has one internal Omni prompt per scene x viewpoint, ids matching the student grid', () => {
    const expected = SCENES.flatMap((scene) =>
      VIEWPOINTS.map((v) => `${scene.id}-${v.id.toLowerCase()}`),
    )
    expect(CURATED_SCENES.map((s) => s.id).sort()).toEqual(expected.sort())
    for (const scene of CURATED_SCENES) {
      expect(scene.internalOmniPrompt).toContain('8-second video')
      expect(['DRAFT', 'GENERATED', 'APPROVED']).toContain(scene.status)
    }
  })

  it('locks style, anatomy, and world continuity in words', () => {
    expect(CURATED_STYLE).toContain('STYLE LOCK')
    expect(CURATED_STYLE).toContain('exactly two arms')
    expect(CURATED_STYLE.toLowerCase()).toContain('no floating letters')
    expect(CURATED_STYLE.toLowerCase()).toContain('no horror')
    expect(SCENE_BIBLE).toContain('SAME place')
    expect(SCENE_BIBLE).toContain('only the moment and the camera')
  })

  it('each prompt names its scene and viewpoint exactly once', () => {
    for (const scene of CURATED_SCENES) {
      expect(scene.internalOmniPrompt).toContain('SCENE:')
      const view =
        scene.viewpoint === 'FELICITY'
          ? "FELICITY'S VIEW"
          : scene.viewpoint === 'JONAH'
            ? "THE BOY'S VIEW"
            : "THE WORLD'S VIEW"
      expect(scene.internalOmniPrompt).toContain(view)
    }
  })
})
