/// <reference types="jest" />
import { createQueryBuilder, resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import {
  fetchMyReviewedTransactionIds,
  fetchTransactionReview,
  fetchUserRating,
  fetchUserReviews,
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
  jest.restoreAllMocks()
})

describe('fetchUserReviews', () => {
  it('scopes to the reviewee', async () => {
    const builder = createQueryBuilder({ data: [REVIEW], error: null, count: 1 })
    supabase.from.mockReturnValue(builder)

    await fetchUserReviews('seller')

    expect(supabase.from).toHaveBeenCalledWith('reviews')
    expect(builder.eq).toHaveBeenCalledWith('reviewee_id', 'seller')
  })
})

describe('fetchMyReviewedTransactionIds', () => {
  it('returns the reviewed transaction ids', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: [{ transaction_id: 't1' }], error: null })
    )

    const ids = await fetchMyReviewedTransactionIds('buyer')
    expect(ids.has('t1')).toBe(true)
  })
})

describe('fetchTransactionReview', () => {
  it('returns the viewer review', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: REVIEW, error: null }))
    await expect(fetchTransactionReview('t1', 'buyer')).resolves.toEqual(REVIEW)
  })
})

describe('fetchUserRating', () => {
  it('maps the user_rating RPC row', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ rating_avg: 4.5, rating_count: 2 }], error: null })
    await expect(fetchUserRating('seller')).resolves.toEqual({ ratingAvg: 4.5, ratingCount: 2 })
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
      expect.objectContaining({ transaction_id: 't1', comment: 'Smooth' })
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
