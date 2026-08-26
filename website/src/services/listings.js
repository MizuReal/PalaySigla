import { supabase } from './supabaseClient.js'

const PAGE_SIZE_DEFAULT = 12
const SIGNED_URL_TTL_SECONDS = 60
const SIGNED_URL_CACHE_TTL_MS = 45_000

export const LISTING_STATUSES = Object.freeze({
  ACTIVE: 'active',
  SOLD: 'sold',
})

export const LISTING_UNITS = Object.freeze(['kg', 'sack', 'cavan', 'lot'])

export const LISTING_CATEGORIES = Object.freeze([
  'palay',
  'rice',
  'seeds',
  'machinery',
  'other',
])

export const LISTING_SORTS = Object.freeze({
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
})

const SORT_COLUMNS = Object.freeze({
  [LISTING_SORTS.NEWEST]: { column: 'created_at', ascending: false },
  [LISTING_SORTS.PRICE_ASC]: { column: 'price', ascending: true },
  [LISTING_SORTS.PRICE_DESC]: { column: 'price', ascending: false },
})

const signedUrlCache = new Map()

export async function fetchListings({
  category = null,
  search = '',
  sort = LISTING_SORTS.NEWEST,
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
} = {}) {
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

export async function getListing(id) {
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
}) {
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

export async function uploadListingImage(file, listingId, userId, position = 0) {
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

export async function softDeleteListing(id) {
  const { error } = await supabase
    .from('listings')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) {
    throw new Error('Could not remove the listing. Please try again.')
  }
}

export async function updateListingStatus(id, status) {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id)
  if (error) {
    throw new Error('Could not update the listing. Please try again.')
  }
}

export async function getListingImageUrl(storagePath) {
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
