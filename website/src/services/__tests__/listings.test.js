import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock.js'

vi.mock('../supabaseClient.js', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import {
  createListing,
  fetchListings,
  fetchMyListings,
  getListing,
  getListingImageUrl,
  LISTING_CATEGORIES,
  LISTING_SORTS,
  LISTING_UNITS,
  softDeleteListing,
  updateListingStatus,
  uploadListingImage,
} from '../listings.js'

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.restoreAllMocks()
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
    expect(Object.isFrozen(LISTING_UNITS)).toBe(true)
    expect(Object.isFrozen(LISTING_SORTS)).toBe(true)
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
      sort: LISTING_SORTS.PRICE_ASC,
      page: 2,
      limit: 5,
    })

    expect(builder.eq).toHaveBeenCalledWith('category', 'rice')
    expect(builder.or).toHaveBeenCalledWith(
      'title.ilike.%palay%,location_label.ilike.%palay%'
    )
    expect(builder.order).toHaveBeenCalledWith('price', { ascending: true })
    expect(builder.range).toHaveBeenCalledWith(5, 9)
  })

  it('falls back to newest for an unknown sort and defaults the total to 0', async () => {
    const builder = createQueryBuilder({ data: null, error: null, count: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchListings({ sort: 'bogus' })).resolves.toEqual({ data: null, total: 0 })
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('throws a friendly error when the query fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' }, count: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchListings()).rejects.toThrow('Could not load listings. Please try again.')
  })
})

describe('fetchMyListings', () => {
  it('requires a user id', async () => {
    await expect(fetchMyListings()).rejects.toThrow(
      'Could not load your listings. Please try again.'
    )
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('queries by user without a status filter for the all filter', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(builder)

    await fetchMyListings({ userId: 'u1', page: 3, limit: 4 })

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.eq).not.toHaveBeenCalledWith('status', expect.anything())
    expect(builder.is).not.toHaveBeenCalled()
    expect(builder.range).toHaveBeenCalledWith(8, 11)
    expect(builder.select).toHaveBeenCalledWith('*, listing_images(id, storage_path, position)', {
      count: 'exact',
    })
  })

  it('applies the active, sold, and deleted filters', async () => {
    const activeBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(activeBuilder)
    await fetchMyListings({ userId: 'u1', filter: 'active' })
    expect(activeBuilder.eq).toHaveBeenCalledWith('status', 'active')
    expect(activeBuilder.is).toHaveBeenCalledWith('deleted_at', null)

    const soldBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(soldBuilder)
    await fetchMyListings({ userId: 'u1', filter: 'sold' })
    expect(soldBuilder.eq).toHaveBeenCalledWith('status', 'sold')
    expect(soldBuilder.is).toHaveBeenCalledWith('deleted_at', null)

    const deletedBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(deletedBuilder)
    await fetchMyListings({ userId: 'u1', filter: 'deleted' })
    expect(deletedBuilder.not).toHaveBeenCalledWith('deleted_at', 'is', null)
  })

  it('throws a friendly error when the query fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' }, count: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchMyListings({ userId: 'u1' })).rejects.toThrow(
      'Could not load your listings. Please try again.'
    )
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

describe('createListing', () => {
  it('inserts the snake_case payload and returns the new id', async () => {
    const builder = createQueryBuilder({ data: { id: 'new-id' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      createListing({
        userId: 'u1',
        title: 'T',
        description: 'D',
        price: 25,
        unit: 'kg',
        category: 'palay',
        quantity: 100,
        lat: 14,
        lng: 121,
        locationLabel: 'Manila',
        sellerName: 'Juan',
      })
    ).resolves.toBe('new-id')

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      title: 'T',
      description: 'D',
      price: 25,
      unit: 'kg',
      category: 'palay',
      quantity: 100,
      lat: 14,
      lng: 121,
      location_label: 'Manila',
      seller_name: 'Juan',
    })
    expect(builder.select).toHaveBeenCalledWith('id')
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the insert fails', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(createListing({ userId: 'u1' })).rejects.toThrow(
      'Could not create the listing. Please try again.'
    )
  })
})

describe('uploadListingImage', () => {
  it('uploads to the user/listing path and records the image row', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    const file = { name: 'photo.jpg' }
    await expect(uploadListingImage(file, 'L1', 'u1')).resolves.toBe('u1/L1/0.jpg')

    expect(supabase.storage.from).toHaveBeenCalledWith('listings')
    expect(bucket.upload).toHaveBeenCalledWith('u1/L1/0.jpg', file, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    expect(builder.insert).toHaveBeenCalledWith({
      listing_id: 'L1',
      storage_path: 'u1/L1/0.jpg',
      position: 0,
    })
  })

  it('respects the requested position', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(createQueryBuilder({ error: null }))

    await expect(uploadListingImage({}, 'L1', 'u1', 2)).resolves.toBe('u1/L1/2.jpg')
    expect(bucket.upload).toHaveBeenCalledWith('u1/L1/2.jpg', {}, {
      contentType: 'image/jpeg',
      upsert: false,
    })
  })

  it('throws a friendly error when the upload fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadListingImage({}, 'L1', 'u1')).rejects.toThrow(
      'Could not upload the photo. Please try again.'
    )
  })

  it('throws a friendly error when the image row insert fails', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(uploadListingImage({}, 'L1', 'u1')).rejects.toThrow(
      'Could not save the photo. Please try again.'
    )
  })
})

describe('softDeleteListing', () => {
  it('stamps deleted_at and targets the row id', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-10T12:00:00Z'))
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await softDeleteListing('L1')

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: '2026-09-10T12:00:00.000Z' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'L1')
    vi.useRealTimers()
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(softDeleteListing('L1')).rejects.toThrow(
      'Could not remove the listing. Please try again.'
    )
  })
})

describe('updateListingStatus', () => {
  it('updates the status of the given row', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await updateListingStatus('L1', 'sold')

    expect(builder.update).toHaveBeenCalledWith({ status: 'sold' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'L1')
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(updateListingStatus('L1', 'sold')).rejects.toThrow(
      'Could not update the listing. Please try again.'
    )
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
    const nowSpy = vi.spyOn(Date, 'now')
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
