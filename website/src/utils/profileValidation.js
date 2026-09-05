import { NAME_PATTERN } from './validation.js'

export const NAME_REQUIRED_ERROR =
  'Please enter your name (2\u201360 characters, letters with spaces, hyphens, or apostrophes).'

export const PHONE_INVALID_ERROR =
  'Enter a valid Philippine mobile number, e.g. 0917 123 4567.'

export const MAX_PHONE_INPUT_LENGTH = 20

// Philippine mobile: 11-digit local form starting 09 (NSN 9XXXXXXXXX after
// the trunk prefix). Carrier prefixes are not validated — mobile number
// portability (2021+) made them unreliable identifiers.
const LOCAL_MOBILE_PATTERN = /^09\d{9}$/
const COUNTRY_CODE = '63'
const E164_PREFIX = '+63'
const NATIONAL_NUMBER_LENGTH = 10

// characters allowed while typing/pasting: digits, one leading +, separators
const ALLOWED_PHONE_CHARS = /^[\d+\s().-]*$/

// keeps digits, a leading +, and typable separators; everything else is junk
export function stripPhoneInput(value) {
  return value.replace(/[^\d+().-\s]/g, '').slice(0, MAX_PHONE_INPUT_LENGTH)
}

function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

// accepts 09XXXXXXXXX, 639XXXXXXXXX, and +639XXXXXXXXX in any separator style
function toNationalNumber(value) {
  const stripped = value.trim()
  if (!stripped) {
    return ''
  }
  // reject hidden junk outright (e.g. "0917a1234567") instead of dropping it
  if (!ALLOWED_PHONE_CHARS.test(stripped)) {
    return null
  }
  if (stripped.startsWith(E164_PREFIX)) {
    const national = digitsOnly(stripped.slice(E164_PREFIX.length))
    return national.length === NATIONAL_NUMBER_LENGTH ? national : null
  }
  const digits = digitsOnly(stripped)
  if (digits.startsWith('0')) {
    return LOCAL_MOBILE_PATTERN.test(digits) ? digits.slice(1) : null
  }
  if (digits.startsWith(COUNTRY_CODE) && digits.length === COUNTRY_CODE.length + NATIONAL_NUMBER_LENGTH) {
    return digits.slice(COUNTRY_CODE.length)
  }
  return null
}

// '' stays '' (field is optional); invalid input becomes null
export function toE164Phone(value) {
  const national = toNationalNumber(value)
  if (national === null) {
    return null
  }
  return national === '' ? '' : `${E164_PREFIX}${national}`
}

// E.164 (+639171234567) -> local display form (0917 123 4567)
export function toLocalPhoneDisplay(e164) {
  if (!e164) {
    return ''
  }
  const national = digitsOnly(e164).slice(COUNTRY_CODE.length)
  if (national.length !== NATIONAL_NUMBER_LENGTH || !national.startsWith('9')) {
    return ''
  }
  return `0${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
}

export function validateName(value) {
  if (!value.trim()) {
    return ''
  }
  if (!NAME_PATTERN.test(value.trim())) {
    return NAME_REQUIRED_ERROR
  }
  return ''
}

export function validatePhone(value) {
  if (!value.trim()) {
    return ''
  }
  return toE164Phone(value) === null ? PHONE_INVALID_ERROR : ''
}

// submit-time pass: name is required, phone is optional but must be valid
export function validateProfileFields({ fullName, phone }) {
  const errors = {}
  if (!fullName.trim()) {
    errors.fullName = NAME_REQUIRED_ERROR
  } else if (!NAME_PATTERN.test(fullName.trim())) {
    errors.fullName = NAME_REQUIRED_ERROR
  }
  if (phone.trim()) {
    const phoneError = validatePhone(phone)
    if (phoneError) {
      errors.phone = phoneError
    }
  }
  return errors
}
