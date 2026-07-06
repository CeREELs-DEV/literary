// tests/player.test.js
import fs from 'node:fs'
import { describe, it, expect } from 'vitest'
import { BOOKS } from '../src/books-data.js'
import { CURATED_SCENES } from '../scripts/curated-scenes.mjs'

describe('Matter of Perspective — books data', () => {
  it('offers the three sample books', () => {
    expect(Object.keys(BOOKS)).toEqual(['snicker', 'james', 'cuentista'])
  })

  it('every book fills its full povs x beats grid with a playable cell', () => {
    for (const book of Object.values(BOOKS)) {
      expect(book.povs.length).toBeGreaterThanOrEqual(3)
      expect(book.beats.length).toBeGreaterThanOrEqual(2)
      for (const pov of book.povs) {
        for (const beat of book.beats) {
          const cell = book.cells[`${pov.key}|${beat.key}`]
          expect(cell, `${book.book}: ${pov.key}|${beat.key}`).toBeTruthy()
          expect(!!cell.video || typeof cell.svg === 'function').toBe(true)
        }
      }
    }
  })

  it('marks one beat block in the excerpt per beat (text-driven playback)', () => {
    for (const book of Object.values(BOOKS)) {
      const blocks = [...book.excerpt.matchAll(/data-beat="(\d+)"/g)].map((m) => +m[1])
      expect(blocks).toEqual(book.beats.map((_, i) => i))
    }
  })

  it('snicker plays the nine real films, and the assets exist on disk', () => {
    const snicker = BOOKS.snicker
    for (const pov of snicker.povs) {
      for (const beat of snicker.beats) {
        const cell = snicker.cells[`${pov.key}|${beat.key}`]
        expect(cell.video).toBe(`/curated/${beat.key}-${pov.key}.mp4`)
        expect(cell.poster).toBe(`/curated/${beat.key}-${pov.key}.jpg`)
        expect(fs.existsSync(`public${cell.video}`), cell.video).toBe(true)
        expect(fs.existsSync(`public${cell.poster}`), cell.poster).toBe(true)
      }
    }
  })

  it('cuentista plays real films where produced, storyboard fallback intact', () => {
    const cuentista = BOOKS.cuentista
    const wired = {
      'petra|b1': 'cuentista-1a',
      'javier|b1': 'cuentista-1b',
      'petra|b2': 'cuentista-2',
      'petra|b3': 'cuentista-3',
    }
    for (const [key, id] of Object.entries(wired)) {
      const cell = cuentista.cells[key]
      expect(cell.video).toBe(`/curated/${id}.mp4`)
      expect(cell.poster).toBe(`/curated/${id}.jpg`)
      expect(typeof cell.svg).toBe('function') // fallback until/unless the film loads
    }
  })

  it('NEVER ships generation internals to the student page', () => {
    const source = fs.readFileSync('src/books-data.js', 'utf8')
    expect(source).not.toContain('internalOmniPrompt')
    expect(source.toLowerCase()).not.toContain('gemini')
    expect(source.toLowerCase()).not.toContain('omni')
  })
})

describe('internal production data (makers only)', () => {
  it('covers exactly the snicker grid with one prompt per film', () => {
    const snicker = BOOKS.snicker
    const expected = snicker.beats.flatMap((beat) =>
      snicker.povs.map((pov) => `${beat.key}-${pov.key}`),
    )
    expect(CURATED_SCENES.map((s) => s.id).sort()).toEqual(expected.sort())
    for (const scene of CURATED_SCENES) {
      expect(scene.internalOmniPrompt).toContain('8-second video')
      expect(['DRAFT', 'GENERATED', 'APPROVED']).toContain(scene.status)
    }
  })
})
