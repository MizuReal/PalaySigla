import { supabase } from './supabaseClient'
import type { ReviewRow } from '../types/domain'

const PAGE_SIZE_DEFAULT = 20

export const REVIEW_ROLES = Object.freeze({
  BUYER: 'buyer',
  SELLER: 'seller',
} as const)

export type ReviewRole = (typeof REVIEW_ROLES)[keyof typeof REVIEW_ROLES]

export const MIN_RATING = 1
export const MAX_RATING = 5
export const MAX_COMMENT_CHARS = 1000

export interface ReviewsPage {
  data: ReviewRow[] | null
  total: number
}

export interface FetchReviewsParams {
  page?: number
  limit?: number
}

export interface RatingSummary {
  ratingAvg: number
  ratingCount: number
}

export interface SubmitReviewInput {
  transactionId: string
  listingTitle: string
  reviewerId: string
  reviewerName: string
  revieweeId: string
  revieweeName: string
  reviewerRole: ReviewRole
  rating: number
  comment: string
}

// Public reviews received by a user (newest first).
export async function fetchUserReviews(
  userId: string,
  { page = 1, limit = PAGE_SIZE_DEFAULT }: FetchReviewsParams = {}
): Promise<ReviewsPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('reviews')
    .select('*', { count: 'exact' })
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    throw new Error('Could not load reviews. Please try again.')
  }
  return { data: data as ReviewRow[] | null, total: count ?? 0 }
}

// The set of transaction ids the viewer has already reviewed, so a surface can
// show "Reviewed" instead of "Leave a review".
export async function fetchMyReviewedTransactionIds(
  userId: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('reviews')
    .select('transaction_id')
    .eq('reviewer_id', userId)
  if (error) {
    throw new Error('Could not load your reviews. Please try again.')
  }
  return new Set((data ?? []).map((row) => row.transaction_id))
}

export async function fetchTransactionReview(
  transactionId: string,
  reviewerId: string
): Promise<ReviewRow | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('transaction_id', transactionId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle()
  if (error) {
    throw new Error('Could not load your review. Please try again.')
  }
  return data as ReviewRow | null
}

// Public-safe aggregate for a user; profiles themselves stay owner-only.
export async function fetchUserRating(userId: string): Promise<RatingSummary> {
  const { data, error } = await supabase.rpc('user_rating', { p_user: userId })
  if (error) {
    throw new Error('Could not load the rating. Please try again.')
  }
  const row = data?.[0]
  return {
    ratingAvg: row?.rating_avg ?? 0,
    ratingCount: row?.rating_count ?? 0,
  }
}

export async function submitReview({
  transactionId,
  listingTitle,
  reviewerId,
  reviewerName,
  revieweeId,
  revieweeName,
  reviewerRole,
  rating,
  comment,
}: SubmitReviewInput): Promise<void> {
  const trimmed = comment.trim()
  const { error } = await supabase.from('reviews').insert({
    transaction_id: transactionId,
    listing_title: listingTitle,
    reviewer_id: reviewerId,
    reviewer_name: reviewerName,
    reviewee_id: revieweeId,
    reviewee_name: revieweeName,
    reviewer_role: reviewerRole,
    rating,
    comment: trimmed ? trimmed : null,
  })
  if (error) {
    throw new Error('Could not submit your review. Please try again.')
  }
}
