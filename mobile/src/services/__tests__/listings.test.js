import { createQueryBuilder, createStorageBucketMock, resetSupabaseMock } from '../../test/supabaseMock.js'

jest.mock('../supabaseClient.js', () => {
  const { createSupabaseMock } = jest.requireActual('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import {
  fetchListings,
  getListing,
  getListingImageUrl,
  LISTING_CATEGORIES,
  LISTING_SORTS,
  LISTING_UNITS,
} from '../listings.js'

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

    await expect(fetchListings({ sort: 'bogus' })).resolves.toEqual({ data: null, total: 0 })
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
