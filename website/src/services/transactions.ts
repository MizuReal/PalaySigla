import { supabase } from './supabaseClient'
import type { TransactionRow } from '../types/domain'

const PAGE_SIZE_DEFAULT = 20

export const TRANSACTION_STATUSES = Object.freeze({
  RESERVED: 'reserved',
  SOLD: 'sold',
  CANCELLED: 'cancelled',
} as const)

export type TransactionStatus =
  (typeof TRANSACTION_STATUSES)[keyof typeof TRANSACTION_STATUSES]

export const TRANSACTION_SORTS = Object.freeze({
  NEWEST: 'newest',
  OLDEST: 'oldest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
} as const)

export type TransactionSort =
  (typeof TRANSACTION_SORTS)[keyof typeof TRANSACTION_SORTS]

const SORT_COLUMNS: Record<
  TransactionSort,
  { column: 'created_at' | 'price'; ascending: boolean }
> = {
  [TRANSACTION_SORTS.NEWEST]: { column: 'created_at', ascending: false },
  [TRANSACTION_SORTS.OLDEST]: { column: 'created_at', ascending: true },
  [TRANSACTION_SORTS.PRICE_ASC]: { column: 'price', ascending: true },
  [TRANSACTION_SORTS.PRICE_DESC]: { column: 'price', ascending: false },
}

export interface TransactionsPage {
  data: TransactionRow[] | null
  total: number
}

export interface FetchTransactionsParams {
  page?: number
  limit?: number
  sort?: TransactionSort
}

// Buyer-side purchased/reserved records. RLS scopes every query to the caller,
// so these survive the listing leaving the feed or being soft-deleted.
export async function fetchMyPurchases(
  userId: string,
  {
    page = 1,
    limit = PAGE_SIZE_DEFAULT,
    sort = TRANSACTION_SORTS.NEWEST,
  }: FetchTransactionsParams = {}
): Promise<TransactionsPage> {
  const sortSpec = SORT_COLUMNS[sort] ?? SORT_COLUMNS[TRANSACTION_SORTS.NEWEST]
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('buyer_id', userId)
    .neq('status', TRANSACTION_STATUSES.CANCELLED)
    .order(sortSpec.column, { ascending: sortSpec.ascending })
    .order('id', { ascending: true })
    .range(from, to)
  if (error) {
    throw new Error('Could not load your purchases. Please try again.')
  }
  return { data: data as TransactionRow[] | null, total: count ?? 0 }
}

// Latest live (reserved/sold) transaction for a listing, as seen by the caller.
// RLS returns null when the caller is not a participant.
export async function fetchListingTransaction(
  listingId: string
): Promise<TransactionRow | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('listing_id', listingId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    throw new Error('Could not load the transaction. Please try again.')
  }
  return data as TransactionRow | null
}

// A single transaction by id; RLS returns null when the caller is not a party.
export async function fetchTransaction(
  transactionId: string
): Promise<TransactionRow | null> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle()
  if (error) {
    throw new Error('Could not load the transaction. Please try again.')
  }
  return data as TransactionRow | null
}
