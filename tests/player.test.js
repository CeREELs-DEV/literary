// tests/player.test.js
import fs from 'node:fs'
import { describe, it, expect } from 'vitest'
import { BOOKS } from '../src/books-data.js'
import { CURATED_SCENES } from '../scripts/curated-scenes.mjs'

const publicAssetPath = (url) => `public/${url.replace(/^\.?\//, '')}`

describe('Matter of Perspective — books data', () => {
  it('offers the three sample books', () => {
    expect(Object.keys(BOOKS)).toEqual(['james', 'snicker', 'cuentista'])
  })

  it('uses James as the first and active static book tab', () => {
    const html = fs.readFileSync('index.html', 'utf8')
    const tabs = [...html.matchAll(/<button class="([^"]*booktab[^"]*)" data-b="([^"]+)"/g)].map(
      ([, classes, key]) => ({ classes: classes.split(/\s+/), key }),
    )
    expect(tabs.map((tab) => tab.key)).toEqual(['james', 'snicker', 'cuentista'])
    expect(tabs[0].classes).toContain('on')
    expect(tabs.slice(1).some((tab) => tab.classes.includes('on'))).toBe(false)

    const main = fs.readFileSync('src/main.js', 'utf8')
    expect(main).toContain('let bookKey = Object.keys(BOOKS)[0]')
  })

  it('includes the question and point-of-view support hooks from the reference page', () => {
    const html = fs.readFileSync('index.html', 'utf8')
    const styles = fs.readFileSync('src/styles.css', 'utf8')
    const main = fs.readFileSync('src/main.js', 'utf8')

    expect(html).toContain('<div class="qsection" id="qsection"></div>')
    expect(styles).toContain('.qsection')
    expect(styles).toContain('.recap')
    expect(styles).toContain('.povinfo')
    expect(styles).toContain('.huntable')
    expect(main).toContain('function renderQuestions')
    expect(main).toContain('function bindPovInfo')
  })

  it('uses deploy-safe relative paths for GitHub Pages project hosting', () => {
    const html = fs.readFileSync('index.html', 'utf8')
    const config = fs.readFileSync('vite.config.js', 'utf8')
    const source = fs.readFileSync('src/books-data.js', 'utf8')

    expect(html).toContain('href="./src/styles.css"')
    expect(html).toContain('src="./src/main.js"')
    expect(html).not.toContain('href="/src/')
    expect(html).not.toContain('src="/src/')
    expect(config).toContain("base: './'")
    expect(source).toContain('const asset =')
    expect(source).not.toContain("video:'/curated/")
    expect(source).not.toContain("poster:'/curated/")
  })

  it('adds setup, point-of-view info, and passage-owned questions for every book', () => {
    for (const [key, book] of Object.entries(BOOKS)) {
      expect(book.setup, key).toEqual(expect.any(String))
      expect(book.setup.length, key).toBeGreaterThan(20)
      expect(book.povInfo, key).toContain('<b>')
      expect(book.questions, key).toHaveLength(3)
      expect(book.questions.every((q) => q.part && q.q && q.type), key).toBe(true)
      expect(book.questions.some((q) => q.type === 'find'), key).toBe(true)
      expect(book.excerpt, key).toContain('class="huntable"')
      expect(book.excerpt, key).toContain('data-correct="1"')
    }
  })

  it('cuentista offers Camera plus the two character POVs across three beats', () => {
    expect(BOOKS.cuentista.povs.map((p) => p.key)).toEqual(['wide', 'petra', 'javier'])
    expect(BOOKS.cuentista.beats).toHaveLength(3)
  })

  it('every book fills its full povs x beats grid with a playable cell', () => {
    for (const book of Object.values(BOOKS)) {
      expect(book.povs.length).toBeGreaterThanOrEqual(2)
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
        expect(cell.video.endsWith(`curated/${beat.key}-${pov.key}.mp4`)).toBe(true)
        expect(cell.poster.endsWith(`curated/${beat.key}-${pov.key}.jpg`)).toBe(true)
        expect(fs.existsSync(publicAssetPath(cell.video)), cell.video).toBe(true)
        expect(fs.existsSync(publicAssetPath(cell.poster)), cell.poster).toBe(true)
      }
    }
  })

  it('james plays the six real films, and the assets exist on disk', () => {
    const james = BOOKS.james
    const wired = {
      'wide|b1': 'james-b1-wide',
      'james|b1': 'james-b1-james',
      'bugs|b1': 'james-b1-bugs',
      'wide|b2': 'james-b2-wide',
      'james|b2': 'james-b2-james',
      'bugs|b2': 'james-b2-bugs',
    }
    for (const [key, id] of Object.entries(wired)) {
      const cell = james.cells[key]
      expect(cell.video.endsWith(`curated/${id}.mp4`)).toBe(true)
      expect(cell.poster.endsWith(`curated/${id}.jpg`)).toBe(true)
      expect(fs.existsSync(publicAssetPath(cell.video)), cell.video).toBe(true)
      expect(fs.existsSync(publicAssetPath(cell.poster)), cell.poster).toBe(true)
      expect(typeof cell.svg).toBe('function')
    }
  })

  it('cuentista plays real films where produced, storyboard fallback intact', () => {
    const cuentista = BOOKS.cuentista
    const wired = {
      'wide|b1': 'cuentista-1a',
      'wide|b2': 'cuentista-2',
      'wide|b3': 'cuentista-3',
      'petra|b1': 'cuentista-p1',
      'petra|b2': 'cuentista-p2',
      'petra|b3': 'cuentista-p3',
      'javier|b1': 'cuentista-j1',
      'javier|b2': 'cuentista-j2',
      'javier|b3': 'cuentista-j3',
    }
    for (const [key, id] of Object.entries(wired)) {
      const cell = cuentista.cells[key]
      expect(cell.video.endsWith(`curated/${id}.mp4`)).toBe(true)
      expect(cell.poster.endsWith(`curated/${id}.jpg`)).toBe(true)
      expect(typeof cell.svg).toBe('function') // fallback until/unless the film loads
    }
  })

  it('NEVER ships generation internals to the student page', () => {
    const source = fs.readFileSync('src/books-data.js', 'utf8')
    expect(source).not.toContain('internalOmniPrompt')
    expect(source.toLowerCase()).not.toContain('internalomniprompt')
    expect(source.toLowerCase()).not.toContain('gemini')
    expect(source.toLowerCase()).not.toContain('omni prompt')
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
