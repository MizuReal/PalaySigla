import { describe, expect, it } from 'vitest'
import {
  DESCRIPTION_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
  validateListingStep,
} from '../listingValidation.js'

const VALID_DETAILS = Object.freeze({
  title: 'Fresh palay harvest',
  description: 'Dry, cleaned, ready for milling.',
  price: '25',
  unit: 'kg',
  category: 'palay',
  quantity: '100',
})

describe('validateListingStep step 1 (details)', () => {
  it('accepts a valid details step with no errors', () => {
    expect(validateListingStep(1, VALID_DETAILS)).toEqual({})
  })

  it('rejects titles outside the length bounds', () => {
    expect(validateListingStep(1, { ...VALID_DETAILS, title: 'ab' }).title).toBe(
      `Title must be ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters.`
    )
    expect(
      validateListingStep(1, { ...VALID_DETAILS, title: 'a'.repeat(TITLE_MAX_LENGTH + 1) })
        .title
    ).toBe(`Title must be ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters.`)
  })

  it('trims the title before checking its length', () => {
    expect(validateListingStep(1, { ...VALID_DETAILS, title: '  ab  ' }).title).toBeDefined()
    expect(validateListingStep(1, { ...VALID_DETAILS, title: '  abc  ' }).title).toBeUndefined()
  })

  it('rejects descriptions over the maximum length', () => {
    expect(validateListingStep(1, { ...VALID_DETAILS, description: 'a'.repeat(DESCRIPTION_MAX_LENGTH) })).toEqual({})
    expect(
      validateListingStep(1, {
        ...VALID_DETAILS,
        description: 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1),
      }).description
    ).toBe(`Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`)
  })

  it('rejects empty, non-numeric, and negative prices', () => {
    const expected = 'Enter a valid price of 0 or more.'
    expect(validateListingStep(1, { ...VALID_DETAILS, price: '' }).price).toBe(expected)
    expect(validateListingStep(1, { ...VALID_DETAILS, price: 'abc' }).price).toBe(expected)
    expect(validateListingStep(1, { ...VALID_DETAILS, price: '-1' }).price).toBe(expected)
    expect(validateListingStep(1, { ...VALID_DETAILS, price: '0' }).price).toBeUndefined()
    expect(validateListingStep(1, { ...VALID_DETAILS, price: 0 }).price).toBeUndefined()
  })

  it('rejects unknown units and categories', () => {
    expect(validateListingStep(1, { ...VALID_DETAILS, unit: 'ton' }).unit).toBe('Choose a unit.')
    expect(validateListingStep(1, { ...VALID_DETAILS, category: 'feed' }).category).toBe(
      'Choose a category.'
    )
  })

  it('allows an empty quantity but rejects invalid values', () => {
    expect(validateListingStep(1, { ...VALID_DETAILS, quantity: '' }).quantity).toBeUndefined()
    expect(validateListingStep(1, { ...VALID_DETAILS, quantity: 'abc' }).quantity).toBe(
      'Quantity must be 0 or more.'
    )
    expect(validateListingStep(1, { ...VALID_DETAILS, quantity: '-5' }).quantity).toBe(
      'Quantity must be 0 or more.'
    )
  })
})

describe('validateListingStep step 2 (photo)', () => {
  it('requires an image file', () => {
    expect(validateListingStep(2, {})).toEqual({ photo: 'Add a photo of your listing.' })
    expect(validateListingStep(2, { imageFile: {} })).toEqual({})
  })
})

describe('validateListingStep step 3 (location)', () => {
  it('requires both coordinates and a non-blank label', () => {
    const expected = { location: 'Pin your location on the map.' }
    expect(validateListingStep(3, { lat: null, lng: 121, locationLabel: 'Manila' })).toEqual(expected)
    expect(validateListingStep(3, { lat: 14, lng: null, locationLabel: 'Manila' })).toEqual(expected)
    expect(validateListingStep(3, { lat: 14, lng: 121, locationLabel: '   ' })).toEqual(expected)
    expect(validateListingStep(3, { lat: 14, lng: 121, locationLabel: 'Manila' })).toEqual({})
  })

  it('falls back to location validation for unknown steps', () => {
    expect(validateListingStep(99, { lat: null, lng: null, locationLabel: '' })).toEqual({
      location: 'Pin your location on the map.',
    })
  })
})
