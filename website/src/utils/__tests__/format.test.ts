import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATEGORY_LABELS,
  UNIT_LABELS,
  formatCoordinates,
  formatDate,
  formatPrice,
  formatRelativeTime,
} from '../format.js'

describe('formatPrice', () => {
  it('formats PHP amounts with the en-PH peso symbol', () => {
    expect(formatPrice(0)).toBe('₱0')
    expect(formatPrice(1234.5)).toBe('₱1,234.5')
    expect(formatPrice(20000)).toBe('₱20,000')
  })

  it('rounds to at most two fraction digits', () => {
    expect(formatPrice(99.999)).toBe('₱100')
  })
})

describe('formatCoordinates', () => {
  it('renders four decimals with hemisphere suffixes', () => {
    expect(formatCoordinates(14.5995123, 120.9842195)).toBe('14.5995° N, 120.9842° E')
    expect(formatCoordinates(-6.2, -106.8166)).toBe('6.2000° S, 106.8166° W')
  })

  it('treats zero as a positive hemisphere', () => {
    expect(formatCoordinates(0, 0)).toBe('0.0000° N, 0.0000° E')
  })
})

describe('formatDate', () => {
  it('renders a short en-PH date', () => {
    expect(formatDate('2026-08-25T12:00:00Z')).toBe('Aug 25, 2026')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-10T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders elapsed minutes, hours, and days', () => {
    expect(formatRelativeTime('2026-09-10T11:59:50Z')).toBe('just now')
    expect(formatRelativeTime('2026-09-10T11:55:00Z')).toBe('5m ago')
    expect(formatRelativeTime('2026-09-10T11:01:00Z')).toBe('59m ago')
    expect(formatRelativeTime('2026-09-10T09:00:00Z')).toBe('3h ago')
    expect(formatRelativeTime('2026-09-09T13:00:00Z')).toBe('23h ago')
    expect(formatRelativeTime('2026-09-08T12:00:00Z')).toBe('2d ago')
    expect(formatRelativeTime('2026-09-03T13:00:00Z')).toBe('6d ago')
  })

  it('falls back to an absolute date at seven days and beyond', () => {
    expect(formatRelativeTime('2026-09-03T12:00:00Z')).toBe('Sep 3, 2026')
    expect(formatRelativeTime('2026-08-11T12:00:00Z')).toBe('Aug 11, 2026')
  })
})

describe('label maps', () => {
  it('exposes frozen category and unit labels', () => {
    expect(CATEGORY_LABELS).toEqual({
      palay: 'Palay',
      rice: 'Rice',
      seeds: 'Seeds',
      machinery: 'Machinery',
      other: 'Other',
    })
    expect(UNIT_LABELS).toEqual({
      kg: 'per kg',
      sack: 'per sack',
      cavan: 'per cavan',
      lot: 'per lot',
    })
    expect(Object.isFrozen(CATEGORY_LABELS)).toBe(true)
    expect(Object.isFrozen(UNIT_LABELS)).toBe(true)
  })
})
