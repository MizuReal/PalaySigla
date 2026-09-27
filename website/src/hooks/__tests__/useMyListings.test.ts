import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/listings', () => ({
  fetchMyListings: vi.fn(),
  MY_LISTING_FILTERS: {
    ALL: 'all',
    ACTIVE: 'active',
    RESERVED: 'reserved',
    SOLD: 'sold',
    DELETED: 'deleted',
  },
  MY_LISTING_SORTS: {
    NEWEST: 'newest',
    OLDEST: 'oldest',
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
  },
}))

import { fetchMyListings } from '../../services/listings'
import type { MyListingsPage } from '../../services/listings'
import type { MyListingWithTransaction } from '../../types/domain'
import useMyListings from '../useMyListings'

function page(data: { id: string }[], total: number): MyListingsPage {
  return { data: data as unknown as MyListingWithTransaction[], total }
}

const fetchMyListingsMock = vi.mocked(fetchMyListings)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useMyListings', () => {
  it('loads the requested page and sort for the active filter', async () => {
    fetchMyListingsMock.mockResolvedValue(page([{ id: '1' }], 25))

    const { result } = renderHook(() =>
      useMyListings({ userId: 'u1', filter: 'sold', sort: 'price_asc', page: 2 })
    )

    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(fetchMyListings).toHaveBeenCalledWith({
      userId: 'u1',
      filter: 'sold',
      sort: 'price_asc',
      page: 2,
      limit: 12,
    })
    expect(result.current.listings).toEqual([{ id: '1' }])
    expect(result.current.total).toBe(25)
    expect(result.current.isPageLoading).toBe(false)
  })

  it('marks later page loads as page loading, not initial', async () => {
    fetchMyListingsMock.mockResolvedValue(page([{ id: '1' }], 25))

    const { result, rerender } = renderHook(
      ({ pageNumber }) => useMyListings({ userId: 'u1', page: pageNumber }),
      { initialProps: { pageNumber: 1 } }
    )
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    rerender({ pageNumber: 2 })

    await waitFor(() => expect(result.current.isPageLoading).toBe(false))
    expect(fetchMyListings).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    )
    expect(result.current.isInitialLoading).toBe(false)
  })

  it('clears state without a user id', async () => {
    const { result } = renderHook(() => useMyListings())

    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))
    expect(fetchMyListings).not.toHaveBeenCalled()
    expect(result.current.listings).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('keeps the previous rows while the next page is in flight', async () => {
    let resolveSecond: (value: MyListingsPage) => void = () => {}
    fetchMyListingsMock
      .mockResolvedValueOnce(page([{ id: '1' }], 25))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve
          })
      )

    const { result, rerender } = renderHook(
      ({ pageNumber }) => useMyListings({ userId: 'u1', page: pageNumber }),
      { initialProps: { pageNumber: 1 } }
    )
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    rerender({ pageNumber: 2 })
    await waitFor(() => expect(result.current.isPageLoading).toBe(true))
    expect(result.current.listings).toEqual([{ id: '1' }])

    await act(async () => {
      resolveSecond(page([{ id: '2' }], 25))
    })
    await waitFor(() => expect(result.current.listings).toEqual([{ id: '2' }]))
  })

  it('refetches when the refresh key changes', async () => {
    fetchMyListingsMock.mockResolvedValue(page([{ id: '1' }], 1))

    const { result, rerender } = renderHook(
      ({ refreshKey }) => useMyListings({ userId: 'u1', refreshKey }),
      { initialProps: { refreshKey: 0 } }
    )
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    rerender({ refreshKey: 1 })
    await waitFor(() => expect(fetchMyListings).toHaveBeenCalledTimes(2))
  })

  it('surfaces failures and retries', async () => {
    fetchMyListingsMock
      .mockRejectedValueOnce(new Error('Could not load your listings. Please try again.'))
      .mockResolvedValueOnce(page([{ id: '1' }], 1))

    const { result } = renderHook(() => useMyListings({ userId: 'u1' }))
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Could not load your listings. Please try again.'
      )
    )

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.error).toBe(''))
    expect(result.current.listings).toEqual([{ id: '1' }])
  })
})
