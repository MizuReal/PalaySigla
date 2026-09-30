export const RSBSA_PATTERN = /^RSBSA-[0-9]{2}-[0-9]{6}-[0-9]{4}$/

export const RSBSA_INVALID_ERROR =
  'Enter a valid RSBSA number, e.g. RSBSA-12-345678-9012.'

export const FARM_SIZE_INVALID_ERROR =
  'Enter the farm size in hectares, e.g. 1.5 (between 0 and 100,000).'

export const YEARS_FARMING_INVALID_ERROR =
  'Enter the years of farming experience (0\u2013100).'

export const DATE_ISSUED_REQUIRED_ERROR = 'Enter the date the document was issued.'

export const DATE_ISSUED_FUTURE_ERROR = 'The issue date cannot be in the future.'

export const MAX_FARM_SIZE_HECTARES = 100000
export const MAX_YEARS_FARMING_EXPERIENCE = 100
export const MAX_LOCATION_FIELD_LENGTH = 80
export const MAX_ORGANIZATION_NAME_LENGTH = 160
export const MAX_ISSUING_OFFICE_LENGTH = 120
export const MAX_CERTIFICATE_NUMBER_LENGTH = 60
export const MAX_MEMBERSHIP_ID_LENGTH = 60
export const MAX_DOCUMENT_LABEL_LENGTH = 120

// '' stays '' because every RSBSA field is optional
export function validateRsbsa(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return RSBSA_PATTERN.test(trimmed) ? '' : RSBSA_INVALID_ERROR
}

export function parseFarmSize(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  const parsed = Number(trimmed)
  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > MAX_FARM_SIZE_HECTARES ||
    !/^\d+(\.\d{1,2})?$/.test(trimmed)
  ) {
    return null
  }
  return parsed
}

export function validateFarmSize(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return parseFarmSize(trimmed) === null ? FARM_SIZE_INVALID_ERROR : ''
}

export function parseYearsFarming(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  if (!/^\d{1,3}$/.test(trimmed)) {
    return null
  }
  const parsed = Number(trimmed)
  return parsed <= MAX_YEARS_FARMING_EXPERIENCE ? parsed : null
}

export function validateYearsFarming(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  return parseYearsFarming(trimmed) === null ? YEARS_FARMING_INVALID_ERROR : ''
}

// the DB stores a date; the input is a yyyy-mm-dd value from <input type="date">
export function validateDateIssued(value: string, todayIso: string): string {
  if (!value) {
    return DATE_ISSUED_REQUIRED_ERROR
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) {
    return DATE_ISSUED_REQUIRED_ERROR
  }
  return value > todayIso ? DATE_ISSUED_FUTURE_ERROR : ''
}
