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
export type ProfileRow = Tables<'profiles'>
export type ForumPostRow = Tables<'forum_posts'>
export type ForumCommentRow = Tables<'forum_comments'>

// heart counts are denormalized columns on the rows; the viewer's own
// reaction is attached by the service that fetched them
export type ForumPostSummary = ForumPostRow & {
  hasHearted: boolean
}

export type ForumCommentItem = ForumCommentRow & {
  hasHearted: boolean
}

export type ListingImageRef = Pick<ListingImageRow, 'id' | 'storage_path' | 'position'>

export type ListingWithImages = ListingRow & {
  listing_images: ListingImageRef[]
}
