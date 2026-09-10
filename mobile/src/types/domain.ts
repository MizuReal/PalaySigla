import type { Tables } from './database'
import type {
  ListingCategory,
  ListingStatus,
  ListingUnit,
} from '../services/listings'

// The generated row types keep CHECK-constrained columns as `string`; the
// domain layer narrows them to the unions the app already validates against.
type ListingBaseRow = Tables<'listings'>

export type ListingRow = Omit<ListingBaseRow, 'category' | 'status' | 'unit'> & {
  category: ListingCategory
  status: ListingStatus
  unit: ListingUnit
}

export type ListingImageRow = Tables<'listing_images'>

export type ListingImageRef = Pick<ListingImageRow, 'id' | 'storage_path' | 'position'>

export type ListingWithImages = ListingRow & {
  listing_images: ListingImageRef[]
}
