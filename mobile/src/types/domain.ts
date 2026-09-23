import type { Tables } from './database'
import type {
  ListingCategory,
  ListingStatus,
  ListingUnit,
} from '../services/listings'
import type { ForumCategory } from '../utils/forumCategories'

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

// The profile row feeds the Settings account surface (avatar, name, phone,
// rating aggregates). The generated row types are all the app needs here.
export type ProfileRow = Tables<'profiles'>

// Forum rows: the CHECK-constrained category is narrowed to the domain union,
// and the feed/thread summaries carry the viewer's heart state.
type ForumPostBaseRow = Tables<'forum_posts'>

export type ForumPostRow = Omit<ForumPostBaseRow, 'category'> & {
  category: ForumCategory
}

export type ForumCommentRow = Tables<'forum_comments'>
export type ForumImageRow = Tables<'forum_images'>

export type ForumImageRef = Pick<ForumImageRow, 'id' | 'storage_path' | 'position'>

export type ForumPostWithImages = ForumPostRow & {
  forum_images: ForumImageRef[]
}

export type ForumPostSummary = ForumPostWithImages & { hasHearted: boolean }
export type ForumCommentItem = ForumCommentRow & { hasHearted: boolean }
