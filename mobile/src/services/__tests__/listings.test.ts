/// <reference types="jest" />
import { createQueryBuilder, createStorageBucketMock, resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import {
  createListing,
  fetchListings,
  fetchMyListings,
  getListing,
  getListingImageUrl,
  LISTING_CATEGORIES,
  LISTING_SORTS,
  LISTING_UNITS,
  MY_LISTING_FILTERS,
  softDeleteListing,
  updateListingStatus,
  uploadListingImage,
} from '../listings'
import type { ListingSort } from '../listings'

// jest.mock swaps in a mock instance; the real SupabaseClient type exposes no mock helpers
const supabase = supabaseClient as unknown as SupabaseMock

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('constants', () => {
  it('keeps the listing vocabularies frozen and stable', () => {
    expect(LISTING_UNITS).toEqual(['kg', 'sack', 'cavan', 'lot'])
    expect(LISTING_CATEGORIES).toEqual(['palay', 'rice', 'seeds', 'machinery', 'other'])
    expect(LISTING_SORTS).toEqual({
      NEWEST: 'newest',
      PRICE_ASC: 'price_asc',
      PRICE_DESC: 'price_desc',
    })
    expect(MY_LISTING_FILTERS).toEqual({
      ALL: 'all',
      ACTIVE: 'active',
      SOLD: 'sold',
      DELETED: 'deleted',
    })
    expect(Object.isFrozen(LISTING_UNITS)).toBe(true)
    expect(Object.isFrozen(LISTING_SORTS)).toBe(true)
    expect(Object.isFrozen(MY_LISTING_FILTERS)).toBe(true)
  })
})

describe('fetchListings', () => {
  it('applies default filter, sort, and pagination', async () => {
    const builder = createQueryBuilder({ data: [{ id: '1' }], error: null, count: 2 })
    supabase.from.mockReturnValue(builder)

    await expect(fetchListings()).resolves.toEqual({ data: [{ id: '1' }], total: 2 })

    expect(supabase.from).toHaveBeenCalledWith('listings')
    expect(builder.select).toHaveBeenCalledWith('*, listing_images(id, storage_path, position)', {
      count: 'exact',
    })
    expect(builder.eq).toHaveBeenCalledWith('status', 'active')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.order).toHaveBeenCalledWith('position', {
      referencedTable: 'listing_images',
      ascending: true,
    })
    expect(builder.range).toHaveBeenCalledWith(0, 11)
    expect(builder.or).not.toHaveBeenCalled()
  })

  it('adds category, trimmed search, sort, and page window', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(builder)

    await fetchListings({
      category: 'rice',
      search: '  palay  ',
      sort: LISTING_SORTS.PRICE_DESC,
      page: 2,
      limit: 5,
    })

    expect(builder.eq).toHaveBeenCalledWith('category', 'rice')
    expect(builder.or).toHaveBeenCalledWith(
      'title.ilike.%palay%,location_label.ilike.%palay%'
    )
    expect(builder.order).toHaveBeenCalledWith('price', { ascending: false })
    expect(builder.range).toHaveBeenCalledWith(5, 9)
  })

  it('falls back to newest for an unknown sort and defaults the total to 0', async () => {
    const builder = createQueryBuilder({ data: null, error: null, count: null })
    supabase.from.mockReturnValue(builder)

    // stale persisted sort values are not part of the type but must be handled
    await expect(fetchListings({ sort: 'bogus' as ListingSort })).resolves.toEqual({
      data: null,
      total: 0,
    })
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('throws a friendly error when the query fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' }, count: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchListings()).rejects.toThrow('Could not load listings. Please try again.')
  })
})

describe('getListing', () => {
  it('returns the single listing row', async () => {
    const row = { id: 'L1', title: 'Palay' }
    const builder = createQueryBuilder({ data: row, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(getListing('L1')).resolves.toEqual(row)
    expect(builder.eq).toHaveBeenCalledWith('id', 'L1')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.order).toHaveBeenCalledWith('position', {
      referencedTable: 'listing_images',
    })
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the listing is missing', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'not found' } })
    supabase.from.mockReturnValue(builder)

    await expect(getListing('missing')).rejects.toThrow('That listing could not be found.')
  })
})

describe('getListingImageUrl', () => {
  it('creates a signed URL and serves it from cache within the TTL', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/cache' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getListingImageUrl('cache/listings/0.jpg')).resolves.toBe(
      'https://signed.test/cache'
    )
    await expect(getListingImageUrl('cache/listings/0.jpg')).resolves.toBe(
      'https://signed.test/cache'
    )

    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('cache/listings/0.jpg', 60)
  })

  it('refetches once the cache TTL has elapsed', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/expiry' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    const base = 1_800_000_000_000
    const nowSpy = jest.spyOn(Date, 'now')
    nowSpy.mockReturnValue(base)

    await getListingImageUrl('expiry/listings/0.jpg')
    nowSpy.mockReturnValue(base + 10_000)
    await getListingImageUrl('expiry/listings/0.jpg')
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(base + 46_000)
    await getListingImageUrl('expiry/listings/0.jpg')
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(2)
  })

  it('throws a friendly error when signing fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getListingImageUrl('missing/listings/0.jpg')).rejects.toThrow(
      'Could not load the listing photo.'
    )
  })
})

describe('fetchMyListings', () => {
  it('scopes to the owner and paginates', async () => {
    const builder = createQueryBuilder({ data: [{ id: 'L1' }], error: null, count: 3 })
    supabase.from.mockReturnValue(builder)

    await expect(fetchMyListings({ userId: 'u1', page: 2, limit: 5 })).resolves.toEqual({
      data: [{ id: 'L1' }],
      total: 3,
    })

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.range).toHaveBeenCalledWith(5, 9)
  })

  it('applies the active, sold, and deleted filters', async () => {
    const activeBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(activeBuilder)
    await fetchMyListings({ userId: 'u1', filter: MY_LISTING_FILTERS.ACTIVE })
    expect(activeBuilder.eq).toHaveBeenCalledWith('status', 'active')
    expect(activeBuilder.is).toHaveBeenCalledWith('deleted_at', null)

    const soldBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(soldBuilder)
    await fetchMyListings({ userId: 'u1', filter: MY_LISTING_FILTERS.SOLD })
    expect(soldBuilder.eq).toHaveBeenCalledWith('status', 'sold')

    const deletedBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(deletedBuilder)
    await fetchMyListings({ userId: 'u1', filter: MY_LISTING_FILTERS.DELETED })
    expect(deletedBuilder.not).toHaveBeenCalledWith('deleted_at', 'is', null)
  })

  it('rejects a missing user id without querying', async () => {
    await expect(fetchMyListings()).rejects.toThrow(
      'Could not load your listings. Please try again.'
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('throws a friendly error when the query fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(fetchMyListings({ userId: 'u1' })).rejects.toThrow(
      'Could not load your listings. Please try again.'
    )
  })
})

describe('createListing', () => {
  const INPUT = {
    userId: 'u1',
    title: 'Fresh palay',
    description: 'Dry and clean',
    price: 1200,
    unit: 'sack' as const,
    category: 'palay' as const,
    quantity: 50,
    lat: 14.9548,
    lng: 120.8969,
    locationLabel: 'Baliuag, Bulacan',
    sellerName: 'Juan',
  }

  it('inserts the listing fields and returns the new id', async () => {
    const builder = createQueryBuilder({ data: { id: 'L9' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(createListing(INPUT)).resolves.toBe('L9')

    expect(supabase.from).toHaveBeenCalledWith('listings')
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'Fresh palay',
      description: 'Dry and clean',
      price: 1200,
      unit: 'sack',
      category: 'palay',
      quantity: 50,
      lat: 14.9548,
      lng: 120.8969,
      location_label: 'Baliuag, Bulacan',
      seller_name: 'Juan',
    })
    expect(builder.select).toHaveBeenCalledWith('id')
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the insert fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(createListing(INPUT)).rejects.toThrow(
      'Could not create the listing. Please try again.'
    )
  })
})

describe('uploadListingImage', () => {
  const IMAGE = { uri: 'file:///cache/prepared.jpg', width: 1600, height: 1200 }

  function mockImageBytes(bytes: ArrayBuffer): void {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ arrayBuffer: async () => bytes } as unknown as Response)
  }

  it('uploads the prepared bytes under the owner path and records the image row', async () => {
    const bytes = new ArrayBuffer(16)
    mockImageBytes(bytes)
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(uploadListingImage(IMAGE, 'L1', 'u1')).resolves.toBe('u1/L1/0.jpg')

    expect(globalThis.fetch).toHaveBeenCalledWith(IMAGE.uri)
    expect(supabase.storage.from).toHaveBeenCalledWith('listings')
    expect(bucket.upload).toHaveBeenCalledWith('u1/L1/0.jpg', bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    expect(supabase.from).toHaveBeenCalledWith('listing_images')
    expect(builder.insert).toHaveBeenCalledWith({
      listing_id: 'L1',
      storage_path: 'u1/L1/0.jpg',
      position: 0,
    })
  })

  it('reports storage upload failures', async () => {
    mockImageBytes(new ArrayBuffer(16))
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadListingImage(IMAGE, 'L1', 'u1')).rejects.toThrow(
      'Could not upload the photo. Please try again.'
    )
  })

  it('reports image row failures', async () => {
    mockImageBytes(new ArrayBuffer(16))
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(uploadListingImage(IMAGE, 'L1', 'u1')).rejects.toThrow(
      'Could not save the photo. Please try again.'
    )
  })
})

describe('softDeleteListing', () => {
  it('stamps deleted_at on the row', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(softDeleteListing('L1')).resolves.toBeUndefined()

    expect(builder.update).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'L1')
  })

  it('throws a friendly error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(softDeleteListing('L1')).rejects.toThrow(
      'Could not remove the listing. Please try again.'
    )
  })
})

describe('updateListingStatus', () => {
  it('updates the status column', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(updateListingStatus('L1', 'sold')).resolves.toBeUndefined()

    expect(builder.update).toHaveBeenCalledWith({ status: 'sold' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'L1')
  })

  it('throws a friendly error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(updateListingStatus('L1', 'sold')).rejects.toThrow(
      'Could not update the listing. Please try again.'
    )
  })
})
