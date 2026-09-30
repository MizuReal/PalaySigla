import { describe, expect, it } from 'vitest'
import {
  DATE_ISSUED_FUTURE_ERROR,
  DATE_ISSUED_REQUIRED_ERROR,
  FARM_SIZE_INVALID_ERROR,
  RSBSA_INVALID_ERROR,
  YEARS_FARMING_INVALID_ERROR,
  parseFarmSize,
  parseYearsFarming,
  validateDateIssued,
  validateFarmSize,
  validateRsbsa,
  validateYearsFarming,
} from '../verificationValidation'

describe('validateRsbsa', () => {
  it('accepts an empty value because RSBSA is optional', () => {
    expect(validateRsbsa('')).toBe('')
    expect(validateRsbsa('   ')).toBe('')
  })

  it('accepts the documented format', () => {
    expect(validateRsbsa('RSBSA-12-345678-9012')).toBe('')
  })

  it('rejects malformed numbers', () => {
    expect(validateRsbsa('RSBSA-1-2-3')).toBe(RSBSA_INVALID_ERROR)
    expect(validateRsbsa('12-345678-9012')).toBe(RSBSA_INVALID_ERROR)
    expect(validateRsbsa('RSBSA-AB-345678-9012')).toBe(RSBSA_INVALID_ERROR)
  })
})

describe('farm size', () => {
  it('parses valid hectares', () => {
    expect(parseFarmSize('2.5')).toBe(2.5)
    expect(parseFarmSize('0')).toBe(0)
    expect(parseFarmSize('')).toBeNull()
  })

  it('rejects bad formats and out-of-range values', () => {
    expect(parseFarmSize('2.555')).toBeNull()
    expect(parseFarmSize('-1')).toBeNull()
    expect(parseFarmSize('100001')).toBeNull()
    expect(parseFarmSize('abc')).toBeNull()
  })

  it('validates with a friendly message', () => {
    expect(validateFarmSize('')).toBe('')
    expect(validateFarmSize('1.25')).toBe('')
    expect(validateFarmSize('nope')).toBe(FARM_SIZE_INVALID_ERROR)
  })
})

describe('years farming', () => {
  it('parses whole years only', () => {
    expect(parseYearsFarming('12')).toBe(12)
    expect(parseYearsFarming('0')).toBe(0)
    expect(parseYearsFarming('12.5')).toBeNull()
    expect(parseYearsFarming('101')).toBeNull()
    expect(parseYearsFarming('abc')).toBeNull()
  })

  it('validates with a friendly message', () => {
    expect(validateYearsFarming('')).toBe('')
    expect(validateYearsFarming('25')).toBe('')
    expect(validateYearsFarming('lots')).toBe(YEARS_FARMING_INVALID_ERROR)
  })
})

describe('validateDateIssued', () => {
  it('requires a date', () => {
    expect(validateDateIssued('', '2026-10-01')).toBe(DATE_ISSUED_REQUIRED_ERROR)
  })

  it('accepts today and past dates', () => {
    expect(validateDateIssued('2026-10-01', '2026-10-01')).toBe('')
    expect(validateDateIssued('2025-01-15', '2026-10-01')).toBe('')
  })

  it('rejects future dates', () => {
    expect(validateDateIssued('2026-10-02', '2026-10-01')).toBe(
      DATE_ISSUED_FUTURE_ERROR
    )
  })
})
