import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/forum', () => ({
  FORUM_MAX_IMAGES: 4,
  createForumPost: vi.fn(),
  deleteForumImage: vi.fn(),
  markForumPostEdited: vi.fn(),
  softDeleteForumPost: vi.fn(),
  updateForumPost: vi.fn(),
  uploadForumImage: vi.fn(),
}))

vi.mock('../../context/authContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', user_metadata: { full_name: 'Juan' } },
  }),
}))

import {
  createForumPost,
  deleteForumImage,
  markForumPostEdited,
  softDeleteForumPost,
  updateForumPost,
  uploadForumImage,
} from '../../services/forum'
import useForumPostEditor from '../useForumPostEditor'
import type { ForumPostSummary } from '../../types/domain'

const createForumPostMock = vi.mocked(createForumPost)
const deleteForumImageMock = vi.mocked(deleteForumImage)
const markForumPostEditedMock = vi.mocked(markForumPostEdited)
const softDeleteForumPostMock = vi.mocked(softDeleteForumPost)
const updateForumPostMock = vi.mocked(updateForumPost)
const uploadForumImageMock = vi.mocked(uploadForumImage)

// the services only forward the blob, so a plain object is enough here
const IMAGE_A = { size: 1 } as Blob
const IMAGE_B = { size: 2 } as Blob

function makePost(overrides: Partial<ForumPostSummary> = {}): ForumPostSummary {
  return {
    id: 'p1',
    user_id: 'u1',
    author_name: 'Juan',
    title: 'Title',
    body: 'Body',
    category: 'storage',
    heart_count: 0,
    comment_count: 0,
    created_at: '2026-09-19T00:00:00Z',
    updated_at: null,
    deleted_at: null,
    forum_images: [],
    hasHearted: false,
    ...overrides,
  }
}

const NEW_POST_INPUT = {
  title: 'When to dry?',
  body: 'My palay came in wet.',
  category: 'storage' as const,
  removedImageIds: [],
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useForumPostEditor', () => {
  it('creates the post then uploads each photo at its position', async () => {
    createForumPostMock.mockResolvedValue('new-post')
    uploadForumImageMock
      .mockResolvedValueOnce({ id: 'i1', storage_path: 'u1/new-post/0.jpg', position: 0 })
      .mockResolvedValueOnce({ id: 'i2', storage_path: 'u1/new-post/1.jpg', position: 1 })

    const { result } = renderHook(() => useForumPostEditor())

    await act(async () => {
      await result.current.savePost({ ...NEW_POST_INPUT, newImages: [IMAGE_A, IMAGE_B] })
    })

    expect(createForumPost).toHaveBeenCalledWith({
      userId: 'u1',
      authorName: 'Juan',
      title: 'When to dry?',
      body: 'My palay came in wet.',
      category: 'storage',
    })
    expect(uploadForumImage).toHaveBeenNthCalledWith(1, {
      file: IMAGE_A,
      postId: 'new-post',
      userId: 'u1',
      position: 0,
    })
    expect(uploadForumImage).toHaveBeenNthCalledWith(2, {
      file: IMAGE_B,
      postId: 'new-post',
      userId: 'u1',
      position: 1,
    })
    expect(result.current.error).toBe('')
  })

  it('rolls back uploads and the post when a create upload fails', async () => {
    createForumPostMock.mockResolvedValue('new-post')
    uploadForumImageMock
      .mockResolvedValueOnce({ id: 'i1', storage_path: 'u1/new-post/0.jpg', position: 0 })
      .mockRejectedValueOnce(new Error('Could not upload the photo. Please try again.'))
    deleteForumImageMock.mockResolvedValue(undefined)
    softDeleteForumPostMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useForumPostEditor())

    await act(async () => {
      await expect(
        result.current.savePost({ ...NEW_POST_INPUT, newImages: [IMAGE_A, IMAGE_B] })
      ).rejects.toThrow('Could not upload the photo. Please try again.')
    })

    expect(deleteForumImage).toHaveBeenCalledWith({
      id: 'i1',
      storage_path: 'u1/new-post/0.jpg',
      position: 0,
    })
    expect(softDeleteForumPost).toHaveBeenCalledWith('new-post')
    expect(result.current.error).toBe('Could not upload the photo. Please try again.')
  })

  it('edits the post, deletes removals, and appends new photos after the kept positions', async () => {
    const post = makePost({
      forum_images: [
        { id: 'i1', storage_path: 'u1/p1/0.jpg', position: 0 },
        { id: 'i2', storage_path: 'u1/p1/1.jpg', position: 1 },
      ],
    })
    updateForumPostMock.mockResolvedValue(undefined)
    deleteForumImageMock.mockResolvedValue(undefined)
    uploadForumImageMock.mockResolvedValue({
      id: 'i3',
      storage_path: 'u1/p1/2.jpg',
      position: 2,
    })
    markForumPostEditedMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useForumPostEditor(post))

    await act(async () => {
      await result.current.savePost({
        title: post.title,
        body: post.body,
        category: post.category,
        newImages: [IMAGE_A],
        removedImageIds: ['i1'],
      })
    })

    expect(updateForumPost).toHaveBeenCalledWith({
      postId: 'p1',
      title: 'Title',
      body: 'Body',
      category: 'storage',
    })
    expect(deleteForumImage).toHaveBeenCalledWith({
      id: 'i1',
      storage_path: 'u1/p1/0.jpg',
      position: 0,
    })
    expect(uploadForumImage).toHaveBeenCalledWith({
      file: IMAGE_A,
      postId: 'p1',
      userId: 'u1',
      position: 2,
    })
    // the text was untouched, so the photo change drives the edited marker
    expect(markForumPostEdited).toHaveBeenCalledWith('p1')
  })

  it('does not stamp the edited marker when the content already changed', async () => {
    const post = makePost({
      forum_images: [{ id: 'i1', storage_path: 'u1/p1/0.jpg', position: 0 }],
    })
    updateForumPostMock.mockResolvedValue(undefined)
    uploadForumImageMock.mockResolvedValue({
      id: 'i2',
      storage_path: 'u1/p1/1.jpg',
      position: 1,
    })

    const { result } = renderHook(() => useForumPostEditor(post))

    await act(async () => {
      await result.current.savePost({
        title: 'Updated title',
        body: post.body,
        category: post.category,
        newImages: [IMAGE_A],
        removedImageIds: [],
      })
    })

    expect(markForumPostEdited).not.toHaveBeenCalled()
  })

  it('rejects new posts with more photos than the cap allows', async () => {
    const { result } = renderHook(() => useForumPostEditor())

    await act(async () => {
      await expect(
        result.current.savePost({
          ...NEW_POST_INPUT,
          newImages: [IMAGE_A, IMAGE_A, IMAGE_A, IMAGE_A, IMAGE_A],
        })
      ).rejects.toThrow('You can add up to 4 photos.')
    })

    expect(createForumPost).not.toHaveBeenCalled()
    expect(uploadForumImage).not.toHaveBeenCalled()
  })

  it('counts kept images against the cap on edit', async () => {
    const post = makePost({
      forum_images: [
        { id: 'i1', storage_path: 'u1/p1/0.jpg', position: 0 },
        { id: 'i2', storage_path: 'u1/p1/1.jpg', position: 1 },
        { id: 'i3', storage_path: 'u1/p1/2.jpg', position: 2 },
        { id: 'i4', storage_path: 'u1/p1/3.jpg', position: 3 },
      ],
    })
    const { result } = renderHook(() => useForumPostEditor(post))

    await act(async () => {
      await expect(
        result.current.savePost({
          title: post.title,
          body: post.body,
          category: post.category,
          newImages: [IMAGE_A],
          removedImageIds: [],
        })
      ).rejects.toThrow('You can add up to 4 photos.')
    })

    expect(updateForumPost).not.toHaveBeenCalled()
  })
})
