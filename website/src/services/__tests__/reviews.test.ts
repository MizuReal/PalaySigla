import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder, resetSupabaseMock } from '../../test/supabaseMock'
import type { SupabaseMock } from '../../test/supabaseMock'

vi.mock('../supabaseClient', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient'
import {
  fetchMyReviewedTransactionIds,
  fetchTransactionReview,
  fetchUserRating,
  fetchUserReviews,
  MAX_COMMENT_CHARS,
  MAX_RATING,
  MIN_RATING,
  REVIEW_ROLES,
  submitReview,
} from '../reviews'

const supabase = supabaseClient as unknown as SupabaseMock

const REVIEW = {
  id: 'r1',
  transaction_id: 't1',
  listing_title: 'Palay',
  reviewer_id: 'buyer',
  reviewer_name: 'Bata',
  reviewee_id: 'seller',
  reviewee_name: 'Juan',
  reviewer_role: 'buyer',
  rating: 5,
  comment: 'Smooth transaction',
  created_at: '2026-09-11T00:00:00Z',
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('review constants', () => {
  it('exposes frozen vocabulary and bounds', () => {
    expect(REVIEW_ROLES).toEqual({ BUYER: 'buyer', SELLER: 'seller' })
    expect(MIN_RATING).toBe(1)
    expect(MAX_RATING).toBe(5)
    expect(MAX_COMMENT_CHARS).toBe(1000)
  })
})

describe('fetchUserReviews', () => {
  it('scopes to the reviewee, newest first', async () => {
    const builder = createQueryBuilder({ data: [REVIEW], error: null, count: 1 })
    supabase.from.mockReturnValue(builder)

    const result = await fetchUserReviews('seller')

    expect(supabase.from).toHaveBeenCalledWith('reviews')
    expect(builder.eq).toHaveBeenCalledWith('reviewee_id', 'seller')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result.total).toBe(1)
  })

  it('throws a friendly error on failure', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))
    await expect(fetchUserReviews('seller')).rejects.toThrow(
      'Could not load reviews. Please try again.'
    )
  })
})

describe('fetchMyReviewedTransactionIds', () => {
  it('returns the set of transaction ids the user reviewed', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: [{ transaction_id: 't1' }, { transaction_id: 't2' }], error: null })
    )

    const ids = await fetchMyReviewedTransactionIds('buyer')

    expect(ids.has('t1')).toBe(true)
    expect(ids.has('t2')).toBe(true)
  })
})

describe('fetchTransactionReview', () => {
  it('returns the viewer review for a transaction', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: REVIEW, error: null }))
    await expect(fetchTransactionReview('t1', 'buyer')).resolves.toEqual(REVIEW)
  })
})

describe('fetchUserRating', () => {
  it('maps the user_rating RPC row', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ rating_avg: 4.5, rating_count: 2 }],
      error: null,
    })

    const summary = await fetchUserRating('seller')

    expect(supabase.rpc).toHaveBeenCalledWith('user_rating', { p_user: 'seller' })
    expect(summary).toEqual({ ratingAvg: 4.5, ratingCount: 2 })
  })

  it('defaults to zero when the RPC returns nothing', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })
    await expect(fetchUserRating('seller')).resolves.toEqual({ ratingAvg: 0, ratingCount: 0 })
  })
})

describe('submitReview', () => {
  it('inserts the review with a trimmed comment', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await submitReview({
      transactionId: 't1',
      listingTitle: 'Palay',
      reviewerId: 'buyer',
      reviewerName: 'Bata',
      revieweeId: 'seller',
      revieweeName: 'Juan',
      reviewerRole: REVIEW_ROLES.BUYER,
      rating: 5,
      comment: '  Smooth  ',
    })

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ transaction_id: 't1', rating: 5, comment: 'Smooth' })
    )
  })

  it('stores null for a blank comment', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await submitReview({
      transactionId: 't1',
      listingTitle: 'Palay',
      reviewerId: 'buyer',
      reviewerName: 'Bata',
      revieweeId: 'seller',
      revieweeName: 'Juan',
      reviewerRole: REVIEW_ROLES.BUYER,
      rating: 4,
      comment: '   ',
    })

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null })
    )
  })

  it('throws a friendly error on failure', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))
    await expect(
      submitReview({
        transactionId: 't1',
        listingTitle: 'Palay',
        reviewerId: 'buyer',
        reviewerName: 'Bata',
        revieweeId: 'seller',
        revieweeName: 'Juan',
        reviewerRole: REVIEW_ROLES.BUYER,
        rating: 5,
        comment: '',
      })
    ).rejects.toThrow('Could not submit your review. Please try again.')
  })
})
