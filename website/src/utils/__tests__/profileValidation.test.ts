import { describe, expect, it } from 'vitest'
import {
  MAX_PHONE_INPUT_LENGTH,
  NAME_REQUIRED_ERROR,
  PHONE_INVALID_ERROR,
  stripPhoneInput,
  toE164Phone,
  toLocalPhoneDisplay,
  validateName,
  validatePhone,
  validateProfileFields,
} from '../profileValidation.js'

describe('stripPhoneInput', () => {
  it('keeps digits, a leading plus, and typable separators', () => {
    expect(stripPhoneInput('0917-123-4567')).toBe('0917-123-4567')
    expect(stripPhoneInput('+63 (917) 123 4567')).toBe('+63 (917) 123 4567')
  })

  it('drops unsupported characters', () => {
    expect(stripPhoneInput('0917a1234567')).toBe('09171234567')
    expect(stripPhoneInput('call me at 0917')).toBe('   0917')
  })

  it('truncates to the maximum input length', () => {
    const long = '1'.repeat(MAX_PHONE_INPUT_LENGTH + 5)
    expect(stripPhoneInput(long)).toHaveLength(MAX_PHONE_INPUT_LENGTH)
  })
})

describe('toE164Phone', () => {
  it('keeps empty input empty', () => {
    expect(toE164Phone('')).toBe('')
    expect(toE164Phone('   ')).toBe('')
  })

  it('accepts local, country-code, and E.164 forms', () => {
    expect(toE164Phone('0917 123 4567')).toBe('+639171234567')
    expect(toE164Phone('09171234567')).toBe('+639171234567')
    expect(toE164Phone('639171234567')).toBe('+639171234567')
    expect(toE164Phone('+63 917 123 4567')).toBe('+639171234567')
    expect(toE164Phone('+639171234567')).toBe('+639171234567')
  })

  it('rejects invalid input with null', () => {
    expect(toE164Phone('0917a1234567')).toBeNull()
    expect(toE164Phone('12345')).toBeNull()
    expect(toE164Phone('+63917123456')).toBeNull()
    expect(toE164Phone('0999')).toBeNull()
  })
})

describe('toLocalPhoneDisplay', () => {
  it('formats E.164 numbers as local display form', () => {
    expect(toLocalPhoneDisplay('+639171234567')).toBe('0917 123 4567')
    expect(toLocalPhoneDisplay('+639123456789')).toBe('0912 345 6789')
  })

  it('returns an empty string for missing or malformed numbers', () => {
    expect(toLocalPhoneDisplay('')).toBe('')
    expect(toLocalPhoneDisplay('+1234')).toBe('')
    expect(toLocalPhoneDisplay('+638171234567')).toBe('')
  })
})

describe('validateName', () => {
  it('allows empty input (field is optional until submit)', () => {
    expect(validateName('')).toBe('')
    expect(validateName('   ')).toBe('')
  })

  it('accepts names matching the shared pattern', () => {
    expect(validateName('Juan dela Cruz')).toBe('')
    expect(validateName("Maria O'Connor")).toBe('')
  })

  it('rejects too-short or structurally invalid names', () => {
    expect(validateName('J')).toBe(NAME_REQUIRED_ERROR)
    expect(validateName('Juan123')).toBe(NAME_REQUIRED_ERROR)
  })
})

describe('validatePhone', () => {
  it('allows empty input and valid numbers', () => {
    expect(validatePhone('')).toBe('')
    expect(validatePhone('0917 123 4567')).toBe('')
  })

  it('rejects invalid numbers', () => {
    expect(validatePhone('not a number')).toBe(PHONE_INVALID_ERROR)
    expect(validatePhone('0917')).toBe(PHONE_INVALID_ERROR)
  })
})

describe('validateProfileFields', () => {
  it('requires a name', () => {
    expect(validateProfileFields({ fullName: '', phone: '' })).toEqual({
      fullName: NAME_REQUIRED_ERROR,
    })
    expect(validateProfileFields({ fullName: 'J', phone: '' })).toEqual({
      fullName: NAME_REQUIRED_ERROR,
    })
  })

  it('treats the phone as optional but validates it when present', () => {
    expect(validateProfileFields({ fullName: 'Juan', phone: '' })).toEqual({})
    expect(validateProfileFields({ fullName: 'Juan', phone: '0917 123 4567' })).toEqual({})
    expect(validateProfileFields({ fullName: 'Juan', phone: 'abc' })).toEqual({
      phone: PHONE_INVALID_ERROR,
    })
  })
})
