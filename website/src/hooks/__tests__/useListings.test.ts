import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/listings.js', () => ({
  fetchListings: vi.fn(),
  LISTING_SORTS: { NEWEST: 'newest', PRICE_ASC: 'price_asc', PRICE_DESC: 'price_desc' },
}))

import { fetchListings } from '../../services/listings.js'
import type { ListingsPage } from '../../services/listings.js'
import type { ListingWithImages } from '../../types/domain.js'
import useListings from '../useListings.js'

// the hook only reads `data` and `total`; rows are minimal fixtures, not full listing records
function page(data: { id: string }[], total: number): ListingsPage {
  return { data: data as unknown as ListingWithImages[], total }
}

const fetchListingsMock = vi.mocked(fetchListings)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useListings', () => {
  it('loads the first page and exposes pagination state', async () => {
    fetchListingsMock.mockResolvedValue(page([{ id: '1' }], 3))

    const { result } = renderHook(() => useListings())

    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(fetchListings).toHaveBeenCalledWith({
      category: null,
      search: '',
      sort: 'newest',
      page: 1,
      limit: 12,
    })
    expect(result.current.listings).toEqual([{ id: '1' }])
    expect(result.current.total).toBe(3)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.error).toBe('')
  })

  it('forwards the active filters to the service', async () => {
    fetchListingsMock.mockResolvedValue(page([], 0))

    renderHook(() => useListings({ category: 'rice', search: 'palay', sort: 'price_asc' }))
    await waitFor(() => expect(fetchListings).toHaveBeenCalledTimes(1))

    expect(fetchListings).toHaveBeenCalledWith({
      category: 'rice',
      search: 'palay',
      sort: 'price_asc',
      page: 1,
      limit: 12,
    })
  })

  it('surfaces load failures as an error message', async () => {
    fetchListingsMock.mockRejectedValue(new Error('Could not load listings. Please try again.'))

    const { result } = renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(result.current.error).toBe('Could not load listings. Please try again.')
    expect(result.current.listings).toEqual([])
  })

  it('appends the next page and clears hasMore at the end', async () => {
    fetchListingsMock
      .mockResolvedValueOnce(page([{ id: '1' }], 3))
      .mockResolvedValueOnce(page([{ id: '2' }, { id: '3' }], 3))

    const { result } = renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchListings).toHaveBeenCalledTimes(2)
    expect(fetchListings).toHaveBeenLastCalledWith({
      category: null,
      search: '',
      sort: 'newest',
      page: 2,
      limit: 12,
    })
    expect(result.current.listings).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])
    expect(result.current.hasMore).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('does not request another page when the list is complete', async () => {
    fetchListingsMock.mockResolvedValue(page([{ id: '1' }], 1))

    const { result } = renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchListings).toHaveBeenCalledTimes(1)
  })

  it('surfaces pagination failures as an error message', async () => {
    fetchListingsMock
      .mockResolvedValueOnce(page([{ id: '1' }], 2))
      .mockRejectedValueOnce(new Error('Could not load listings. Please try again.'))

    const { result } = renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.error).toBe('Could not load listings. Please try again.')
    expect(result.current.listings).toEqual([{ id: '1' }])
    expect(result.current.isLoadingMore).toBe(false)
  })
})
