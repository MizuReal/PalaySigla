import { describe, expect, it } from 'vitest'
import {
  MAX_RICE_VARIETIES,
  RICE_VARIETIES,
  normalizeVarietyName,
} from '../riceVarieties'

describe('RICE_VARIETIES', () => {
  it('stays within the database cap and has no duplicates', () => {
    expect(RICE_VARIETIES.length).toBeLessThanOrEqual(MAX_RICE_VARIETIES)
    expect(new Set(RICE_VARIETIES).size).toBe(RICE_VARIETIES.length)
  })
})

describe('normalizeVarietyName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeVarietyName('  Dinorado   rice ')).toBe('Dinorado rice')
  })
})
