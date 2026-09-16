import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/forum', () => ({
  getForumPost: vi.fn(),
}))

vi.mock('../../context/authContext', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}))

import { getForumPost } from '../../services/forum'
import type { ForumPostSummary } from '../../types/domain'
import useForumPost from '../useForumPost'

const getForumPostMock = vi.mocked(getForumPost)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useForumPost', () => {
  it('loads the post for the viewer', async () => {
    getForumPostMock.mockResolvedValue({
      id: 'p1',
      title: 'T',
      hasHearted: false,
    } as ForumPostSummary)

    const { result } = renderHook(() => useForumPost('p1'))

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getForumPost).toHaveBeenCalledWith('p1', 'u1')
    expect(result.current.post).toEqual({ id: 'p1', title: 'T', hasHearted: false })
    expect(result.current.error).toBe('')
  })

  it('surfaces load failures as an error message', async () => {
    getForumPostMock.mockRejectedValue(new Error('That discussion could not be found.'))

    const { result } = renderHook(() => useForumPost('missing'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('That discussion could not be found.')
    expect(result.current.post).toBeNull()
  })

  it('refresh refetches the post', async () => {
    getForumPostMock.mockResolvedValue({ id: 'p1', hasHearted: false } as ForumPostSummary)

    const { result } = renderHook(() => useForumPost('p1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.refresh()
    })

    await waitFor(() => expect(getForumPost).toHaveBeenCalledTimes(2))
    expect(getForumPost).toHaveBeenLastCalledWith('p1', 'u1')
  })
})
