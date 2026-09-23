/// <reference types="jest" />
import {
  NAME_REQUIRED_ERROR,
  PHONE_INVALID_ERROR,
  stripPhoneInput,
  toE164Phone,
  toLocalPhoneDisplay,
  validateName,
  validatePhone,
  validateProfileFields,
} from '../profileValidation'

describe('toE164Phone', () => {
  it('normalizes the accepted Philippine mobile formats', () => {
    expect(toE164Phone('0917 123 4567')).toBe('+639171234567')
    expect(toE164Phone('+63 917 123 4567')).toBe('+639171234567')
    expect(toE164Phone('639171234567')).toBe('+639171234567')
  })

  it('keeps an empty value empty and rejects junk', () => {
    expect(toE164Phone('')).toBe('')
    expect(toE164Phone('0917a1234567')).toBeNull()
    expect(toE164Phone('12345')).toBeNull()
  })
})

describe('toLocalPhoneDisplay', () => {
  it('renders the local display form', () => {
    expect(toLocalPhoneDisplay('+639171234567')).toBe('0917 123 4567')
    expect(toLocalPhoneDisplay('')).toBe('')
  })
})

describe('stripPhoneInput', () => {
  it('keeps typable characters and caps the length', () => {
    expect(stripPhoneInput('+63 (917) 123-4567')).toBe('+63 (917) 123-4567')
    expect(stripPhoneInput('09abc17')).toBe('0917')
  })
})

describe('validateName / validatePhone', () => {
  it('stays silent while the field is empty', () => {
    expect(validateName('')).toBe('')
    expect(validatePhone('')).toBe('')
  })

  it('flags malformed values', () => {
    expect(validateName('a')).toBe(NAME_REQUIRED_ERROR)
    expect(validatePhone('123')).toBe(PHONE_INVALID_ERROR)
    expect(validateName('Juan dela Cruz')).toBe('')
    expect(validatePhone('0917 123 4567')).toBe('')
  })
})

describe('validateProfileFields', () => {
  it('requires a name and validates an optional phone', () => {
    expect(validateProfileFields({ fullName: '', phone: '' })).toEqual({
      fullName: NAME_REQUIRED_ERROR,
    })
    expect(validateProfileFields({ fullName: 'Juan', phone: '123' })).toEqual({
      phone: PHONE_INVALID_ERROR,
    })
    expect(validateProfileFields({ fullName: 'Juan', phone: '' })).toEqual({})
  })
})
