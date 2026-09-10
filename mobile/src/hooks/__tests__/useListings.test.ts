/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  fetchListings: jest.fn(),
  LISTING_SORTS: { NEWEST: 'newest', PRICE_ASC: 'price_asc', PRICE_DESC: 'price_desc' },
}))

import type { ListingsPage } from '../../services/listings'
import { fetchListings } from '../../services/listings'
import useListings from '../useListings'

const mockedFetchListings = jest.mocked(fetchListings)

// listing rows are partial doubles; only the page shape the hook reads is needed
function page(data: { id: string }[] | null, total: number): ListingsPage {
  return { data, total } as ListingsPage
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useListings', () => {
  it('loads the first page and exposes pagination state', async () => {
    mockedFetchListings.mockResolvedValue(page([{ id: '1' }], 3))

    const { result } = await renderHook(() => useListings())

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
    mockedFetchListings.mockResolvedValue(page([], 0))

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
    mockedFetchListings.mockRejectedValue(new Error('Could not load listings. Please try again.'))

    const { result } = await renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(result.current.error).toBe('Could not load listings. Please try again.')
    expect(result.current.listings).toEqual([])
  })

  it('appends the next page and clears hasMore at the end', async () => {
    mockedFetchListings
      .mockResolvedValueOnce(page([{ id: '1' }], 3))
      .mockResolvedValueOnce(page([{ id: '2' }, { id: '3' }], 3))

    const { result } = await renderHook(() => useListings())
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
    mockedFetchListings.mockResolvedValue(page([{ id: '1' }], 1))

    const { result } = await renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchListings).toHaveBeenCalledTimes(1)
  })

  it('surfaces pagination failures as an error message', async () => {
    mockedFetchListings
      .mockResolvedValueOnce(page([{ id: '1' }], 2))
      .mockRejectedValueOnce(new Error('Could not load listings. Please try again.'))

    const { result } = await renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(result.current.error).toBe('Could not load listings. Please try again.')
    expect(result.current.listings).toEqual([{ id: '1' }])
    expect(result.current.isLoadingMore).toBe(false)
  })

  it('reloads page one and replaces the list', async () => {
    mockedFetchListings
      .mockResolvedValueOnce(page([{ id: '1' }], 2))
      .mockResolvedValueOnce(page([{ id: '9' }], 2))

    const { result } = await renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.reload()
    })

    expect(fetchListings).toHaveBeenLastCalledWith({
      category: null,
      search: '',
      sort: 'newest',
      page: 1,
      limit: 12,
    })
    expect(result.current.listings).toEqual([{ id: '9' }])
    expect(result.current.error).toBe('')
  })

  it('surfaces reload failures as an error message', async () => {
    mockedFetchListings
      .mockResolvedValueOnce(page([{ id: '1' }], 2))
      .mockRejectedValueOnce(new Error('Could not load listings. Please try again.'))

    const { result } = await renderHook(() => useListings())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.reload()
    })

    expect(result.current.error).toBe('Could not load listings. Please try again.')
  })
})
