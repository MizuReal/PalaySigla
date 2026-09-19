import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/forum', () => ({
  fetchForumCategoryCounts: vi.fn(),
}))

import { fetchForumCategoryCounts } from '../../services/forum'
import useForumCategoryCounts from '../useForumCategoryCounts'

const fetchCategoryCountsMock = vi.mocked(fetchForumCategoryCounts)

const COUNTS = Object.freeze({
  general: 1,
  planting: 0,
  pests: 3,
  harvesting: 0,
  storage: 0,
  quality: 0,
  market: 2,
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useForumCategoryCounts', () => {
  it('loads counts once and exposes them', async () => {
    fetchCategoryCountsMock.mockResolvedValue(COUNTS)

    const { result } = renderHook(() => useForumCategoryCounts())

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchCategoryCountsMock).toHaveBeenCalledTimes(1)
    expect(result.current.counts).toEqual(COUNTS)
    expect(result.current.error).toBe('')
  })

  it('reloads when the refresh nonce changes', async () => {
    fetchCategoryCountsMock.mockResolvedValue(COUNTS)

    const { rerender } = renderHook(({ nonce }) => useForumCategoryCounts(nonce), {
      initialProps: { nonce: 0 },
    })
    await waitFor(() => expect(fetchCategoryCountsMock).toHaveBeenCalledTimes(1))

    rerender({ nonce: 1 })

    await waitFor(() => expect(fetchCategoryCountsMock).toHaveBeenCalledTimes(2))
  })

  it('surfaces load failures and retries on demand', async () => {
    fetchCategoryCountsMock
      .mockRejectedValueOnce(new Error('Could not load categories. Please try again.'))
      .mockResolvedValueOnce(COUNTS)

    const { result } = renderHook(() => useForumCategoryCounts())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Could not load categories. Please try again.')
    expect(result.current.counts).toBeNull()

    act(() => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.counts).toEqual(COUNTS))
    expect(result.current.error).toBe('')
  })
})
