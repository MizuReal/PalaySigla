/// <reference types="jest" />
import { containsBannedWords, findBannedWords } from '../badwords'

const CLEAN_TEXT = [
  'When should I dry palay after harvest?',
  'Classify the grain by moisture content.',
  'We need to assess the harvest before storage.',
  'The grass around the field is tall.',
  'Peste is the Filipino word for a pest infestation.',
  'Gagawin natin ang tamang pagpapatuyo.',
]

const BANNED_TEXT = [
  'What the fuck is this',
  'GAGO ka ba',
  'This is sh1t',
  'a$$hole behavior',
  'fuuuck this weather',
  'Tangina naman o',
]

describe('containsBannedWords', () => {
  it('returns false for clean, legitimate text', () => {
    for (const text of CLEAN_TEXT) {
      expect(containsBannedWords(text)).toBe(false)
    }
  })

  it('detects banned words regardless of case', () => {
    expect(containsBannedWords('What the FUCK')).toBe(true)
    expect(containsBannedWords('gago')).toBe(true)
  })

  it('detects repeated-letter and leetspeak evasions', () => {
    expect(containsBannedWords('fuuuck')).toBe(true)
    expect(containsBannedWords('sh1t')).toBe(true)
    expect(containsBannedWords('a$$hole')).toBe(true)
  })

  it('detects each banned sample', () => {
    for (const text of BANNED_TEXT) {
      expect(containsBannedWords(text)).toBe(true)
    }
  })
})

describe('findBannedWords', () => {
  it('returns an empty list for clean text', () => {
    expect(findBannedWords('Dry it to 14% moisture.')).toEqual([])
  })

  it('returns the matched words for flagged text', () => {
    const matches = findBannedWords('gago, this is sh1t')
    expect(matches.length).toBe(2)
  })
})
