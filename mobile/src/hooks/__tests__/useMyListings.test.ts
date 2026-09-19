/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  fetchMyListings: jest.fn(),
  MY_LISTING_FILTERS: {
    ALL: 'all',
    ACTIVE: 'active',
    SOLD: 'sold',
    DELETED: 'deleted',
  },
}))

import { fetchMyListings } from '../../services/listings'
import useMyListings from '../useMyListings'

const mockedFetchMyListings = jest.mocked(fetchMyListings)

function listing(id: string): { id: string } {
  return { id }
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useMyListings', () => {
  it('loads the first page for the owner and filter', async () => {
    mockedFetchMyListings.mockResolvedValue({
      data: [listing('L1') as never],
      total: 1,
    })

    const { result } = await renderHook(() =>
      useMyListings({ userId: 'u1', filter: 'sold' })
    )
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(mockedFetchMyListings).toHaveBeenCalledWith({
      userId: 'u1',
      filter: 'sold',
      page: 1,
      limit: 12,
    })
    expect(result.current.listings).toEqual([listing('L1')])
    expect(result.current.total).toBe(1)
    expect(result.current.hasMore).toBe(false)
    expect(result.current.error).toBe('')
  })

  it('surfaces load failures', async () => {
    mockedFetchMyListings.mockRejectedValue(
      new Error('Could not load your listings. Please try again.')
    )

    const { result } = await renderHook(() => useMyListings({ userId: 'u1' }))
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(result.current.error).toBe(
      'Could not load your listings. Please try again.'
    )
    expect(result.current.listings).toEqual([])
  })

  it('appends the next page on loadMore', async () => {
    mockedFetchMyListings
      .mockResolvedValueOnce({ data: [listing('L1') as never], total: 2 })
      .mockResolvedValueOnce({ data: [listing('L2') as never], total: 2 })

    const { result } = await renderHook(() => useMyListings({ userId: 'u1' }))
    await waitFor(() => expect(result.current.hasMore).toBe(true))

    await act(() => result.current.loadMore())

    expect(mockedFetchMyListings).toHaveBeenLastCalledWith({
      userId: 'u1',
      filter: 'all',
      page: 2,
      limit: 12,
    })
    expect(result.current.listings.map((item) => item.id)).toEqual(['L1', 'L2'])
    expect(result.current.hasMore).toBe(false)
  })

  it('keeps the loaded rows when a later page fails', async () => {
    mockedFetchMyListings
      .mockResolvedValueOnce({ data: [listing('L1') as never], total: 3 })
      .mockRejectedValueOnce(new Error('Could not load your listings. Please try again.'))

    const { result } = await renderHook(() => useMyListings({ userId: 'u1' }))
    await waitFor(() => expect(result.current.hasMore).toBe(true))

    await act(() => result.current.loadMore())

    expect(result.current.listings).toEqual([listing('L1')])
    expect(result.current.error).toBe(
      'Could not load your listings. Please try again.'
    )
    expect(result.current.isLoadingMore).toBe(false)
  })
})
