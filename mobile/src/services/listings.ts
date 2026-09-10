// Marketplace data access — browse-only port of the website's listings
// service (mobile/src/services/listings.ts mirrors website/src/services/
// listings.ts). Reads ride the anon key + RLS (select is public for
// non-deleted rows); create/upload/manage calls stay out until the auth
// phase lands, so every mutation-capable function from the web build is
// deliberately absent here.
import { supabase } from './supabaseClient'
import type { ListingWithImages } from '../types/domain'

const PAGE_SIZE_DEFAULT = 12
const SIGNED_URL_TTL_SECONDS = 60
const SIGNED_URL_CACHE_TTL_MS = 45_000

export const LISTING_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SOLD: 'sold',
} as const)

export const LISTING_UNITS = Object.freeze(['kg', 'sack', 'cavan', 'lot'] as const)

export const LISTING_CATEGORIES = Object.freeze([
  'palay',
  'rice',
  'seeds',
  'machinery',
  'other',
] as const)

export const LISTING_SORTS = Object.freeze({
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
} as const)

export type ListingStatus = (typeof LISTING_STATUSES)[keyof typeof LISTING_STATUSES]
export type ListingUnit = (typeof LISTING_UNITS)[number]
export type ListingCategory = (typeof LISTING_CATEGORIES)[number]
export type ListingSort = (typeof LISTING_SORTS)[keyof typeof LISTING_SORTS]

const SORT_COLUMNS: Record<ListingSort, { column: 'created_at' | 'price'; ascending: boolean }> = {
  [LISTING_SORTS.NEWEST]: { column: 'created_at', ascending: false },
  [LISTING_SORTS.PRICE_ASC]: { column: 'price', ascending: true },
  [LISTING_SORTS.PRICE_DESC]: { column: 'price', ascending: false },
}

export interface FetchListingsParams {
  category?: ListingCategory | null
  search?: string
  sort?: ListingSort
  page?: number
  limit?: number
}

export interface ListingsPage {
  data: ListingWithImages[] | null
  total: number
}

// Signed URLs expire server-side (60s); the map defers refetching until a
// fresh URL is genuinely needed, mirroring the website's cache exactly.
const signedUrlCache = new Map<string, { url: string; fetchedAt: number }>()

export async function fetchListings({
  category = null,
  search = '',
  sort = LISTING_SORTS.NEWEST,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
}: FetchListingsParams = {}): Promise<ListingsPage> {
  const sortSpec = SORT_COLUMNS[sort] ?? SORT_COLUMNS[LISTING_SORTS.NEWEST]
  const normalizedSearch = search.trim()
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, position)', { count: 'exact' })
    .eq('status', LISTING_STATUSES.ACTIVE)
    .is('deleted_at', null)
    .order(sortSpec.column, { ascending: sortSpec.ascending })
    .order('position', { referencedTable: 'listing_images', ascending: true })

  if (category) {
    query = query.eq('category', category)
  }
  if (normalizedSearch) {
    query = query.or(
      `title.ilike.%${normalizedSearch}%,location_label.ilike.%${normalizedSearch}%`
    )
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    throw new Error('Could not load listings. Please try again.')
  }
  return { data, total: count ?? 0 }
}

export async function getListing(id: string): Promise<ListingWithImages> {
  const { data, error } = await supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, position)')
    .eq('id', id)
    .is('deleted_at', null)
    .order('position', { referencedTable: 'listing_images' })
    .single()
  if (error) {
    throw new Error('That listing could not be found.')
  }
  return data
}

export async function getListingImageUrl(storagePath: string): Promise<string> {
  const cached = signedUrlCache.get(storagePath)
  if (cached && cached.fetchedAt > Date.now() - SIGNED_URL_CACHE_TTL_MS) {
    return cached.url
  }
  const { data, error } = await supabase.storage
    .from('listings')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) {
    throw new Error('Could not load the listing photo.')
  }
  signedUrlCache.set(storagePath, { url: data.signedUrl, fetchedAt: Date.now() })
  return data.signedUrl
}
