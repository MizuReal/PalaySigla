import { supabase } from './supabaseClient.js'
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

export const MY_LISTING_FILTERS = Object.freeze({
  ALL: 'all',
  ACTIVE: 'active',
  SOLD: 'sold',
  DELETED: 'deleted',
} as const)

export type ListingStatus = (typeof LISTING_STATUSES)[keyof typeof LISTING_STATUSES]
export type ListingUnit = (typeof LISTING_UNITS)[number]
export type ListingCategory = (typeof LISTING_CATEGORIES)[number]
export type ListingSort = (typeof LISTING_SORTS)[keyof typeof LISTING_SORTS]
export type MyListingFilter =
  (typeof MY_LISTING_FILTERS)[keyof typeof MY_LISTING_FILTERS]

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

export interface FetchMyListingsParams {
  userId?: string
  filter?: MyListingFilter
  page?: number
  limit?: number
}

export interface ListingsPage {
  data: ListingWithImages[] | null
  total: number
}

export interface CreateListingInput {
  userId: string
  title: string
  description: string
  price: number
  unit: ListingUnit
  category: ListingCategory
  quantity: number
  lat: number
  lng: number
  locationLabel: string
  sellerName: string
}

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

export async function fetchMyListings({
  userId,
  filter = MY_LISTING_FILTERS.ALL,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
}: FetchMyListingsParams = {}): Promise<ListingsPage> {
  if (!userId) {
    throw new Error('Could not load your listings. Please try again.')
  }
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('listings')
    .select('*, listing_images(id, storage_path, position)', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .order('position', { referencedTable: 'listing_images', ascending: true })

  if (filter === MY_LISTING_FILTERS.ACTIVE) {
    query = query.eq('status', LISTING_STATUSES.ACTIVE).is('deleted_at', null)
  } else if (filter === MY_LISTING_FILTERS.SOLD) {
    query = query.eq('status', LISTING_STATUSES.SOLD).is('deleted_at', null)
  } else if (filter === MY_LISTING_FILTERS.DELETED) {
    query = query.not('deleted_at', 'is', null)
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    throw new Error('Could not load your listings. Please try again.')
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

export async function createListing({
  userId,
  title,
  description,
  price,
  unit,
  category,
  quantity,
  lat,
  lng,
  locationLabel,
  sellerName,
}: CreateListingInput): Promise<string> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      user_id: userId,
      title,
      description,
      price,
      unit,
      category,
      quantity,
      lat,
      lng,
      location_label: locationLabel,
      seller_name: sellerName,
    })
    .select('id')
    .single()
  if (error) {
    throw new Error('Could not create the listing. Please try again.')
  }
  return data.id
}

export async function uploadListingImage(
  file: File,
  listingId: string,
  userId: string,
  position = 0
): Promise<string> {
  const storagePath = `${userId}/${listingId}/${position}.jpg`
  const { error: uploadError } = await supabase.storage
    .from('listings')
    .upload(storagePath, file, { contentType: 'image/jpeg', upsert: false })
  if (uploadError) {
    throw new Error('Could not upload the photo. Please try again.')
  }
  const { error: imageError } = await supabase
    .from('listing_images')
    .insert({ listing_id: listingId, storage_path: storagePath, position })
  if (imageError) {
    throw new Error('Could not save the photo. Please try again.')
  }
  return storagePath
}

export async function softDeleteListing(id: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    throw new Error('Could not remove the listing. Please try again.')
  }
}

export async function updateListingStatus(id: string, status: ListingStatus): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id)
  if (error) {
    throw new Error('Could not update the listing. Please try again.')
  }
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
