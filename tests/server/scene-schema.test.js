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
  it('matches the Tier 1 scene shape at the top level', () => {
    expect(SCENE_SCHEMA.required).toEqual(['id', 'title', 'beats'])
  })

  it('every object schema forbids additional properties (structured outputs requirement)', () => {
    for (const obj of collectObjects(SCENE_SCHEMA)) {
      expect(obj.additionalProperties).toBe(false)
    }
  })

  it('only allows shake and flash effect types in Phase A', () => {
    const effectSchemas = SCENE_SCHEMA.properties.beats.items.properties.effects.items.anyOf
    const types = effectSchemas.map((s) => s.properties.type.const)
    expect(types.sort()).toEqual(['flash', 'shake'])
  })

  it('does not use unsupported numeric constraints', () => {
    const json = JSON.stringify(SCENE_SCHEMA)
    expect(json).not.toMatch(/"minimum"|"maximum"|"minLength"|"maxLength"/)
  })

  it('prompts are non-empty strings mentioning English output', () => {
    expect(SYSTEM_PROMPT).toMatch(/English/)
    expect(typeof USER_INSTRUCTION).toBe('string')
    expect(USER_INSTRUCTION.length).toBeGreaterThan(0)
  })
})
