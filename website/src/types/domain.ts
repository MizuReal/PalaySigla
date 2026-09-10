import type { Tables } from './database'

export type ListingRow = Tables<'listings'>
export type ListingImageRow = Tables<'listing_images'>
export type ProfileRow = Tables<'profiles'>

export type ListingImageRef = Pick<ListingImageRow, 'id' | 'storage_path' | 'position'>

export type ListingWithImages = ListingRow & {
  listing_images: ListingImageRef[]
}
