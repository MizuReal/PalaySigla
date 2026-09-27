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
  fetchListingTransaction,
  fetchMyPurchases,
  fetchMySales,
  TRANSACTION_STATUSES,
} from '../transactions'

const supabase = supabaseClient as unknown as SupabaseMock

const TRANSACTION = {
  id: 't1',
  listing_id: 'L1',
  listing_title: 'Palay',
  price: 1200,
  unit: 'sack',
  seller_id: 'seller',
  seller_name: 'Juan',
  buyer_id: 'buyer',
  buyer_name: 'Bata',
  status: 'sold',
  reserved_at: null,
  sold_at: '2026-09-10T00:00:00Z',
  created_at: '2026-09-09T00:00:00Z',
  updated_at: null,
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('transaction statuses', () => {
  it('exposes the frozen status vocabulary', () => {
    expect(TRANSACTION_STATUSES).toEqual({
      RESERVED: 'reserved',
      SOLD: 'sold',
      CANCELLED: 'cancelled',
    })
  })
})

describe('fetchMyPurchases', () => {
  it('scopes to the buyer and hides cancelled rows', async () => {
    const builder = createQueryBuilder({ data: [TRANSACTION], error: null, count: 1 })
    supabase.from.mockReturnValue(builder)

    await fetchMyPurchases('buyer')

    expect(supabase.from).toHaveBeenCalledWith('transactions')
    expect(builder.eq).toHaveBeenCalledWith('buyer_id', 'buyer')
    expect(builder.neq).toHaveBeenCalledWith('status', 'cancelled')
  })

  it('throws a friendly error on failure', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))
    await expect(fetchMyPurchases('buyer')).rejects.toThrow(
      'Could not load your purchases. Please try again.'
    )
  })
})

describe('fetchMySales', () => {
  it('scopes to the seller', async () => {
    const builder = createQueryBuilder({ data: [TRANSACTION], error: null, count: 1 })
    supabase.from.mockReturnValue(builder)

    await fetchMySales('seller')

    expect(builder.eq).toHaveBeenCalledWith('seller_id', 'seller')
  })
})

describe('fetchListingTransaction', () => {
  it('returns the latest live transaction for a listing', async () => {
    const builder = createQueryBuilder({ data: TRANSACTION, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchListingTransaction('L1')).resolves.toEqual(TRANSACTION)
    expect(builder.eq).toHaveBeenCalledWith('listing_id', 'L1')
  })

  it('returns null when the caller is not a participant', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: null }))
    await expect(fetchListingTransaction('L1')).resolves.toBeNull()
  })
})
