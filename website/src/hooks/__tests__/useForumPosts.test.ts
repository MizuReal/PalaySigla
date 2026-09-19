import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/forum', () => ({
  fetchForumPosts: vi.fn(),
}))

vi.mock('../../context/authContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

import { fetchForumPosts } from '../../services/forum'
import type { ForumPostsPage } from '../../services/forum'
import type { ForumPostSummary } from '../../types/domain'
import useForumPosts from '../useForumPosts'

// the hook only reads `data` and `total`; rows are minimal fixtures
function page(data: { id: string }[], total: number): ForumPostsPage {
  return { data: data as unknown as ForumPostSummary[], total }
}

const fetchForumPostsMock = vi.mocked(fetchForumPosts)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useForumPosts', () => {
  it('loads the first page with the viewer id and exposes pagination state', async () => {
    fetchForumPostsMock.mockResolvedValue(page([{ id: '1' }], 3))

    const { result } = renderHook(() => useForumPosts())

    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(fetchForumPosts).toHaveBeenCalledWith({
      category: null,
      search: '',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
    expect(result.current.posts).toEqual([{ id: '1' }])
    expect(result.current.total).toBe(3)
    expect(result.current.hasMore).toBe(true)
    expect(result.current.error).toBe('')
  })

  it('forwards the active search', async () => {
    fetchForumPostsMock.mockResolvedValue(page([], 0))

    renderHook(() => useForumPosts({ search: 'pests' }))
    await waitFor(() => expect(fetchForumPosts).toHaveBeenCalledTimes(1))

    expect(fetchForumPosts).toHaveBeenCalledWith({
      category: null,
      search: 'pests',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
  })

  it('forwards the active category', async () => {
    fetchForumPostsMock.mockResolvedValue(page([], 0))

    renderHook(() => useForumPosts({ category: 'pests' }))
    await waitFor(() => expect(fetchForumPosts).toHaveBeenCalledTimes(1))

    expect(fetchForumPosts).toHaveBeenCalledWith({
      category: 'pests',
      search: '',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
  })

  it('surfaces load failures as an error message', async () => {
    fetchForumPostsMock.mockRejectedValue(
      new Error('Could not load discussions. Please try again.')
    )

    const { result } = renderHook(() => useForumPosts())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(result.current.error).toBe('Could not load discussions. Please try again.')
    expect(result.current.posts).toEqual([])
  })

  it('appends the next page and clears hasMore at the end', async () => {
    fetchForumPostsMock
      .mockResolvedValueOnce(page([{ id: '1' }], 3))
      .mockResolvedValueOnce(page([{ id: '2' }, { id: '3' }], 3))

    const { result } = renderHook(() => useForumPosts())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchForumPosts).toHaveBeenCalledTimes(2)
    expect(fetchForumPosts).toHaveBeenLastCalledWith({
      category: null,
      search: '',
      page: 2,
      limit: 10,
      userId: 'u1',
    })
    expect(result.current.posts).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }])
    expect(result.current.hasMore).toBe(false)
  })

  it('does not request another page when the list is complete', async () => {
    fetchForumPostsMock.mockResolvedValue(page([{ id: '1' }], 1))

    const { result } = renderHook(() => useForumPosts())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchForumPosts).toHaveBeenCalledTimes(1)
  })

  it('refresh refetches the first page', async () => {
    fetchForumPostsMock.mockResolvedValue(page([{ id: '1' }], 1))

    const { result } = renderHook(() => useForumPosts())
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(fetchForumPosts).toHaveBeenCalledTimes(2))
    expect(fetchForumPosts).toHaveBeenLastCalledWith({
      category: null,
      search: '',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
  })
})
