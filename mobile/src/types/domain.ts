import type { Tables } from './database'
import type {
  ListingCategory,
  ListingStatus,
  ListingUnit,
} from '../services/listings'
import type { ForumCategory } from '../utils/forumCategories'
import type { ReviewRole } from '../services/reviews'
import type { TransactionStatus } from '../services/transactions'

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

// Marketplace messaging: conversations are listing-scoped threads; the inbox
// summary carries the viewer's unread count attached by the service.
export type ConversationRow = Tables<'conversations'>
export type MessageRow = Tables<'messages'>

export type ConversationSummary = ConversationRow & { unreadCount: number }

// Durable reserve/sold record; readable by both participants regardless of the
// listing's feed visibility or soft-deletion.
type TransactionBaseRow = Tables<'transactions'>

export type TransactionRow = Omit<TransactionBaseRow, 'status' | 'unit'> & {
  status: TransactionStatus
  unit: ListingUnit
}

// Public marketplace review, anchored to a sold transaction.
type ReviewBaseRow = Tables<'reviews'>

export type ReviewRow = Omit<ReviewBaseRow, 'reviewer_role'> & {
  reviewer_role: ReviewRole
}
