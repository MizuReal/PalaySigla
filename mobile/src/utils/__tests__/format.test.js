import { CATEGORY_LABELS, UNIT_LABELS, formatPrice, formatRelativeTime } from '../format.js'

describe('formatPrice', () => {
  it('formats PHP amounts with the en-PH peso symbol', () => {
    expect(formatPrice(0)).toBe('₱0')
    expect(formatPrice(1234.5)).toBe('₱1,234.5')
    expect(formatPrice(20000)).toBe('₱20,000')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] })
    jest.setSystemTime(new Date('2026-09-10T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
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
