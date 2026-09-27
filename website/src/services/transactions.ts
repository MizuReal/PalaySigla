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

export interface TransactionsPage {
  data: TransactionRow[] | null
  total: number
}

export interface FetchTransactionsParams {
  page?: number
  limit?: number
}

// Buyer-side purchased/reserved records. RLS scopes every query to the caller,
// so these survive the listing leaving the feed or being soft-deleted.
export async function fetchMyPurchases(
  userId: string,
  { page = 1, limit = PAGE_SIZE_DEFAULT }: FetchTransactionsParams = {}
): Promise<TransactionsPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('buyer_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    throw new Error('Could not load your purchases. Please try again.')
  }
  return { data: data as TransactionRow[] | null, total: count ?? 0 }
}

export async function fetchMySales(
  userId: string,
  { page = 1, limit = PAGE_SIZE_DEFAULT }: FetchTransactionsParams = {}
): Promise<TransactionsPage> {
  const from = (page - 1) * limit
  const to = from + limit - 1
  const { data, error, count } = await supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('seller_id', userId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) {
    throw new Error('Could not load your sales. Please try again.')
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
