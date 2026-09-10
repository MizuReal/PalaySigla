import { isListingCategory, isListingUnit } from '../services/listings.js'

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

export interface ListingStepErrors {
  title?: string
  description?: string
  price?: string
  unit?: string
  category?: string
  quantity?: string
  photo?: string
  location?: string
}

interface ListingDetailsInput {
  title: string
  description: string
  price: string | number
  unit: string
  category: string
  quantity: string | number
}

interface ListingPhotoInput {
  imageFile: Blob | null | undefined
}

interface ListingLocationInput {
  lat: number | null
  lng: number | null
  locationLabel: string
}

export type ListingStepInput = Partial<
  ListingDetailsInput & ListingPhotoInput & ListingLocationInput
>

function validateDetails({
  title = '',
  description = '',
  price = '',
  unit = '',
  category = '',
  quantity = '',
}: Partial<ListingDetailsInput>): ListingStepErrors {
  const errors: ListingStepErrors = {}
  const normalizedTitle = title.trim()
  if (
    normalizedTitle.length < TITLE_MIN_LENGTH ||
    normalizedTitle.length > TITLE_MAX_LENGTH
  ) {
    errors.title = STEP_ERRORS.title
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    errors.description = STEP_ERRORS.description
  }
  if (price === '' || Number.isNaN(Number(price)) || Number(price) < 0) {
    errors.price = STEP_ERRORS.price
  }
  if (!isListingUnit(unit)) {
    errors.unit = STEP_ERRORS.unit
  }
  if (!isListingCategory(category)) {
    errors.category = STEP_ERRORS.category
  }
  if (quantity !== '' && (Number.isNaN(Number(quantity)) || Number(quantity) < 0)) {
    errors.quantity = STEP_ERRORS.quantity
  }
  return errors
}

function validatePhoto({ imageFile }: Partial<ListingPhotoInput>): ListingStepErrors {
  const errors: ListingStepErrors = {}
  if (!imageFile) {
    errors.photo = STEP_ERRORS.photo
  }
  return errors
}

function validateLocation({
  lat = null,
  lng = null,
  locationLabel = '',
}: Partial<ListingLocationInput>): ListingStepErrors {
  const errors: ListingStepErrors = {}
  if (lat === null || lng === null || !locationLabel.trim()) {
    errors.location = STEP_ERRORS.location
  }
  return errors
}

export function validateListingStep(
  step: number,
  data: ListingStepInput
): ListingStepErrors {
  if (step === 1) {
    return validateDetails(data)
  }
  if (step === 2) {
    return validatePhoto(data)
  }
  return validateLocation(data)
}
