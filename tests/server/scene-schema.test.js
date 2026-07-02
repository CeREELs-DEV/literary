// tests/server/scene-schema.test.js
import { describe, it, expect } from 'vitest'
import { SCENE_SCHEMA, SYSTEM_PROMPT, USER_INSTRUCTION } from '../../server/scene-schema.js'

function collectObjects(node, out = []) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    if (node.type === 'object') out.push(node)
    for (const v of Object.values(node)) collectObjects(v, out)
  } else if (Array.isArray(node)) {
    for (const v of node) collectObjects(v, out)
  }
  return out
}

describe('SCENE_SCHEMA', () => {
  it('is a lean text-extraction schema (the book is the product)', () => {
    expect(SCENE_SCHEMA.required).toEqual(['id', 'title', 'beats'])
    expect(SCENE_SCHEMA.properties.beats.items.required).toEqual(['text'])
    expect(Object.keys(SCENE_SCHEMA.properties.beats.items.properties)).toEqual(['text'])
  })

  it('every object schema forbids additional properties (structured outputs requirement)', () => {
    for (const obj of collectObjects(SCENE_SCHEMA)) {
      expect(obj.additionalProperties).toBe(false)
    }
  })

  it('does not use unsupported numeric constraints', () => {
    const json = JSON.stringify(SCENE_SCHEMA)
    expect(json).not.toMatch(/"minimum"|"maximum"|"minLength"|"maxLength"/)
  })

  it('prompts are non-empty strings mentioning English output and passages', () => {
    expect(SYSTEM_PROMPT).toMatch(/English/)
    expect(SYSTEM_PROMPT).toMatch(/passages/)
    expect(typeof USER_INSTRUCTION).toBe('string')
    expect(USER_INSTRUCTION.length).toBeGreaterThan(0)
  })
})
