import { LISTING_CATEGORIES, LISTING_UNITS } from '../services/listings.js'

export const TITLE_MIN_LENGTH = 3
export const TITLE_MAX_LENGTH = 80
export const DESCRIPTION_MAX_LENGTH = 2000

const STEP_ERRORS = Object.freeze({
  title: `Title must be ${TITLE_MIN_LENGTH}-${TITLE_MAX_LENGTH} characters.`,
  description: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  price: 'Enter a valid price of 0 or more.',
  unit: 'Choose a unit.',
  category: 'Choose a category.',
  quantity: 'Quantity must be 0 or more.',
  photo: 'Add a photo of your listing.',
  location: 'Pin your location on the map.',
})

function validateDetails({ title, description, price, unit, category, quantity }) {
  const errors = {}
  const normalizedTitle = title.trim()
  if (normalizedTitle.length < TITLE_MIN_LENGTH || normalizedTitle.length > TITLE_MAX_LENGTH) {
    errors.title = STEP_ERRORS.title
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = STEP_ERRORS.description
  }
  if (price === '' || Number.isNaN(Number(price)) || Number(price) < 0) {
    errors.price = STEP_ERRORS.price
  }
  if (!LISTING_UNITS.includes(unit)) {
    errors.unit = STEP_ERRORS.unit
  }
  if (!LISTING_CATEGORIES.includes(category)) {
    errors.category = STEP_ERRORS.category
  }
  if (quantity !== '' && (Number.isNaN(Number(quantity)) || Number(quantity) < 0)) {
    errors.quantity = STEP_ERRORS.quantity
  }
  return errors
}

function validatePhoto({ imageFile }) {
  const errors = {}
  if (!imageFile) {
    errors.photo = STEP_ERRORS.photo
  }
  return errors
}

function validateLocation({ lat, lng, locationLabel }) {
  const errors = {}
  if (lat === null || lng === null || !locationLabel.trim()) {
    errors.location = STEP_ERRORS.location
  }
  return errors
}

export function validateListingStep(step, data) {
  if (step === 1) {
    return validateDetails(data)
  }
  if (step === 2) {
    return validatePhoto(data)
  }
  return validateLocation(data)
}
