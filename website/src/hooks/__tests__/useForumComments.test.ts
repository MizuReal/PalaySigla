import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/forum', () => ({
  fetchForumComments: vi.fn(),
}))

vi.mock('../../context/authContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

import { fetchForumComments } from '../../services/forum'
import type { ForumCommentsPage } from '../../services/forum'
import type { ForumCommentItem } from '../../types/domain'
import useForumComments from '../useForumComments'

// the hook only reads `data` and `total`; rows are minimal fixtures
function page(data: { id: string }[], total: number): ForumCommentsPage {
  return { data: data as unknown as ForumCommentItem[], total }
}

const fetchForumCommentsMock = vi.mocked(fetchForumComments)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useForumComments', () => {
  it('loads the first page for the post and viewer', async () => {
    fetchForumCommentsMock.mockResolvedValue(page([{ id: 'c1' }], 1))

    const { result } = renderHook(() => useForumComments('p1'))

    expect(result.current.isInitialLoading).toBe(true)
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(fetchForumComments).toHaveBeenCalledWith({
      postId: 'p1',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
    expect(result.current.comments).toEqual([{ id: 'c1' }])
    expect(result.current.total).toBe(1)
    expect(result.current.hasMore).toBe(false)
  })

  it('surfaces load failures as an error message', async () => {
    fetchForumCommentsMock.mockRejectedValue(
      new Error('Could not load comments. Please try again.')
    )

    const { result } = renderHook(() => useForumComments('p1'))
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    expect(result.current.error).toBe('Could not load comments. Please try again.')
    expect(result.current.comments).toEqual([])
  })

  it('appends the next page and clears hasMore at the end', async () => {
    fetchForumCommentsMock
      .mockResolvedValueOnce(page([{ id: 'c1' }], 2))
      .mockResolvedValueOnce(page([{ id: 'c2' }], 2))

    const { result } = renderHook(() => useForumComments('p1'))
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    await act(async () => {
      await result.current.loadMore()
    })

    expect(fetchForumComments).toHaveBeenCalledTimes(2)
    expect(fetchForumComments).toHaveBeenLastCalledWith({
      postId: 'p1',
      page: 2,
      limit: 10,
      userId: 'u1',
    })
    expect(result.current.comments).toEqual([{ id: 'c1' }, { id: 'c2' }])
    expect(result.current.hasMore).toBe(false)
  })

  it('refresh refetches the first page', async () => {
    fetchForumCommentsMock.mockResolvedValue(page([{ id: 'c1' }], 1))

    const { result } = renderHook(() => useForumComments('p1'))
    await waitFor(() => expect(result.current.isInitialLoading).toBe(false))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(fetchForumComments).toHaveBeenCalledTimes(2))
    expect(fetchForumComments).toHaveBeenLastCalledWith({
      postId: 'p1',
      page: 1,
      limit: 10,
      userId: 'u1',
    })
  })
})
