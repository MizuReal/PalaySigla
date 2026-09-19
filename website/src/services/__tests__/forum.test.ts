import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock'
import type { SupabaseMock } from '../../test/supabaseMock'

vi.mock('../supabaseClient', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient'
import {
  FORUM_CATEGORIES,
  createForumComment,
  createForumPost,
  deleteForumImage,
  fetchForumCategoryCounts,
  fetchForumComments,
  fetchForumPosts,
  fetchMyCommentHeartIds,
  fetchMyPostHeartIds,
  getForumImageUrl,
  getForumPost,
  markForumPostEdited,
  setForumCommentHeart,
  setForumPostHeart,
  softDeleteForumComment,
  softDeleteForumPost,
  updateForumComment,
  updateForumPost,
  uploadForumImage,
} from '../forum'

// vi.mock swaps in a mock instance; the real SupabaseClient type exposes no mock helpers
const supabase = supabaseClient as unknown as SupabaseMock

// the mocked storage client never inspects the payload, so a plain object
// stands in for the Blob the real upload accepts
const EMPTY_FILE = {} as Blob

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fetchMyPostHeartIds', () => {
  it('returns an empty set without a user or ids', async () => {
    await expect(fetchMyPostHeartIds(null, ['p1'])).resolves.toEqual(new Set())
    await expect(fetchMyPostHeartIds('u1', [])).resolves.toEqual(new Set())
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('scopes the reaction rows to the user and target ids', async () => {
    const builder = createQueryBuilder({
      data: [{ post_id: 'p1' }, { post_id: null }],
      error: null,
    })
    supabase.from.mockReturnValue(builder)

    const hearted = await fetchMyPostHeartIds('u1', ['p1', 'p2'])

    expect(supabase.from).toHaveBeenCalledWith('forum_reactions')
    expect(builder.select).toHaveBeenCalledWith('post_id')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.in).toHaveBeenCalledWith('post_id', ['p1', 'p2'])
    expect(hearted).toEqual(new Set(['p1']))
  })

  it('throws a friendly error when the query fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(fetchMyPostHeartIds('u1', ['p1'])).rejects.toThrow(
      'Could not load reactions. Please try again.'
    )
  })
})

describe('fetchMyCommentHeartIds', () => {
  it('scopes the reaction rows to the user and target ids', async () => {
    const builder = createQueryBuilder({ data: [{ comment_id: 'c1' }], error: null })
    supabase.from.mockReturnValue(builder)

    const hearted = await fetchMyCommentHeartIds('u1', ['c1'])

    expect(supabase.from).toHaveBeenCalledWith('forum_reactions')
    expect(builder.select).toHaveBeenCalledWith('comment_id')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(builder.in).toHaveBeenCalledWith('comment_id', ['c1'])
    expect(hearted).toEqual(new Set(['c1']))
  })

  it('throws a friendly error when the query fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(fetchMyCommentHeartIds('u1', ['c1'])).rejects.toThrow(
      'Could not load reactions. Please try again.'
    )
  })
})

describe('fetchForumPosts', () => {
  it('applies default filters and attaches heart state', async () => {
    const postsBuilder = createQueryBuilder({
      data: [{ id: 'p1' }, { id: 'p2' }],
      error: null,
      count: 2,
    })
    const heartsBuilder = createQueryBuilder({ data: [{ post_id: 'p1' }], error: null })
    supabase.from
      .mockReturnValueOnce(postsBuilder)
      .mockReturnValueOnce(heartsBuilder)

    const result = await fetchForumPosts({ userId: 'u1' })

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'forum_posts')
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'forum_reactions')
    expect(postsBuilder.select).toHaveBeenCalledWith(
      '*, forum_images(id, storage_path, position)',
      { count: 'exact' }
    )
    expect(postsBuilder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(postsBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(postsBuilder.order).toHaveBeenCalledWith('position', {
      referencedTable: 'forum_images',
      ascending: true,
    })
    expect(postsBuilder.range).toHaveBeenCalledWith(0, 9)
    expect(postsBuilder.eq).not.toHaveBeenCalled()
    expect(postsBuilder.or).not.toHaveBeenCalled()
    expect(result).toEqual({
      data: [
        { id: 'p1', hasHearted: true },
        { id: 'p2', hasHearted: false },
      ],
      total: 2,
    })
  })

  it('adds a trimmed search and the page window', async () => {
    const postsBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(postsBuilder)

    await fetchForumPosts({ search: '  pests  ', page: 3, limit: 5 })

    expect(postsBuilder.or).toHaveBeenCalledWith(
      'title.ilike.%pests%,body.ilike.%pests%'
    )
    expect(postsBuilder.range).toHaveBeenCalledWith(10, 14)
    // no posts means no reaction lookup
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('filters by category when one is selected', async () => {
    const postsBuilder = createQueryBuilder({ data: [], error: null, count: 0 })
    supabase.from.mockReturnValue(postsBuilder)

    await fetchForumPosts({ category: 'pests' })

    expect(postsBuilder.eq).toHaveBeenCalledWith('category', 'pests')
  })

  it('defaults the total to 0 when the count is missing', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: null, count: null })
    )

    await expect(fetchForumPosts()).resolves.toEqual({ data: [], total: 0 })
  })

  it('throws a friendly error when the query fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' }, count: null })
    )

    await expect(fetchForumPosts()).rejects.toThrow(
      'Could not load discussions. Please try again.'
    )
  })
})

describe('fetchForumCategoryCounts', () => {
  it('maps RPC rows onto every category, defaulting missing ones to zero', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { category: 'pests', post_count: 3 },
        { category: 'market', post_count: 1 },
      ],
      error: null,
    })

    const counts = await fetchForumCategoryCounts()

    expect(supabase.rpc).toHaveBeenCalledWith('forum_category_counts')
    expect(Object.keys(counts)).toEqual([...FORUM_CATEGORIES])
    expect(counts).toEqual({
      general: 0,
      planting: 0,
      pests: 3,
      harvesting: 0,
      storage: 0,
      quality: 0,
      market: 1,
    })
  })

  it('ignores rows outside the known category set', async () => {
    supabase.rpc.mockResolvedValue({
      data: [{ category: 'unknown', post_count: 9 }],
      error: null,
    })

    const counts = await fetchForumCategoryCounts()

    expect(Object.values(counts)).toEqual(FORUM_CATEGORIES.map(() => 0))
  })

  it('throws a friendly error when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchForumCategoryCounts()).rejects.toThrow(
      'Could not load categories. Please try again.'
    )
  })
})

describe('getForumPost', () => {
  it('returns the post with the viewer heart state', async () => {
    const postBuilder = createQueryBuilder({ data: { id: 'p1', title: 'T' }, error: null })
    const heartsBuilder = createQueryBuilder({ data: [{ post_id: 'p1' }], error: null })
    supabase.from.mockReturnValueOnce(postBuilder).mockReturnValueOnce(heartsBuilder)

    await expect(getForumPost('p1', 'u1')).resolves.toEqual({
      id: 'p1',
      title: 'T',
      hasHearted: true,
    })
    expect(postBuilder.select).toHaveBeenCalledWith(
      '*, forum_images(id, storage_path, position)'
    )
    expect(postBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(postBuilder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(postBuilder.order).toHaveBeenCalledWith('position', {
      referencedTable: 'forum_images',
      ascending: true,
    })
    expect(postBuilder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the post is missing', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'not found' } })
    )

    await expect(getForumPost('missing')).rejects.toThrow(
      'That discussion could not be found.'
    )
  })
})

describe('fetchForumComments', () => {
  it('reads comments oldest-first and attaches heart state', async () => {
    const commentsBuilder = createQueryBuilder({
      data: [{ id: 'c1' }, { id: 'c2' }],
      error: null,
      count: 2,
    })
    const heartsBuilder = createQueryBuilder({ data: [{ comment_id: 'c2' }], error: null })
    supabase.from
      .mockReturnValueOnce(commentsBuilder)
      .mockReturnValueOnce(heartsBuilder)

    const result = await fetchForumComments({ postId: 'p1', userId: 'u1' })

    expect(commentsBuilder.eq).toHaveBeenCalledWith('post_id', 'p1')
    expect(commentsBuilder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(commentsBuilder.order).toHaveBeenCalledWith('created_at', { ascending: true })
    expect(commentsBuilder.range).toHaveBeenCalledWith(0, 9)
    expect(result).toEqual({
      data: [
        { id: 'c1', hasHearted: false },
        { id: 'c2', hasHearted: true },
      ],
      total: 2,
    })
  })

  it('throws a friendly error when the query fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' }, count: null })
    )

    await expect(fetchForumComments({ postId: 'p1' })).rejects.toThrow(
      'Could not load comments. Please try again.'
    )
  })
})

describe('createForumPost', () => {
  it('inserts the trimmed payload and returns the new id', async () => {
    const builder = createQueryBuilder({ data: { id: 'new-id' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      createForumPost({
        userId: 'u1',
        authorName: 'Juan',
        title: '  Question  ',
        body: '  Body  ',
        category: 'planting',
      })
    ).resolves.toBe('new-id')

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      author_name: 'Juan',
      title: 'Question',
      body: 'Body',
      category: 'planting',
    })
    expect(builder.select).toHaveBeenCalledWith('id')
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the insert fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      createForumPost({
        userId: 'u1',
        authorName: 'Juan',
        title: 'T',
        body: 'B',
        category: 'general',
      })
    ).rejects.toThrow('Could not publish the discussion. Please try again.')
  })
})

describe('updateForumPost', () => {
  it('updates the content of the given post', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await updateForumPost({ postId: 'p1', title: ' T ', body: ' B ', category: 'storage' })

    expect(builder.update).toHaveBeenCalledWith({
      title: 'T',
      body: 'B',
      category: 'storage',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      updateForumPost({ postId: 'p1', title: 'T', body: 'B', category: 'general' })
    ).rejects.toThrow('Could not save the changes. Please try again.')
  })
})

describe('softDeleteForumPost', () => {
  it('stamps deleted_at and targets the row id', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-16T12:00:00Z'))
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await softDeleteForumPost('p1')

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: '2026-09-16T12:00:00.000Z' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    vi.useRealTimers()
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(softDeleteForumPost('p1')).rejects.toThrow(
      'Could not remove the discussion. Please try again.'
    )
  })
})

describe('createForumComment', () => {
  it('inserts the trimmed payload and returns the new id', async () => {
    const builder = createQueryBuilder({ data: { id: 'c1' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      createForumComment({
        postId: 'p1',
        userId: 'u1',
        authorName: 'Maria',
        body: '  Dry it slowly.  ',
      })
    ).resolves.toBe('c1')

    expect(builder.insert).toHaveBeenCalledWith({
      post_id: 'p1',
      user_id: 'u1',
      author_name: 'Maria',
      body: 'Dry it slowly.',
    })
  })

  it('throws a friendly error when the insert fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      createForumComment({ postId: 'p1', userId: 'u1', authorName: 'Maria', body: 'B' })
    ).rejects.toThrow('Could not post the comment. Please try again.')
  })
})

describe('updateForumComment', () => {
  it('updates the body of the given comment', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await updateForumComment({ commentId: 'c1', body: ' Edited ' })

    expect(builder.update).toHaveBeenCalledWith({ body: 'Edited' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(updateForumComment({ commentId: 'c1', body: 'B' })).rejects.toThrow(
      'Could not save the comment. Please try again.'
    )
  })
})

describe('softDeleteForumComment', () => {
  it('stamps deleted_at and targets the row id', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-16T12:00:00Z'))
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await softDeleteForumComment('c1')

    expect(builder.update).toHaveBeenCalledWith({ deleted_at: '2026-09-16T12:00:00.000Z' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
    vi.useRealTimers()
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(softDeleteForumComment('c1')).rejects.toThrow(
      'Could not remove the comment. Please try again.'
    )
  })
})

describe('setForumPostHeart', () => {
  it('inserts a reaction when hearting', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await setForumPostHeart('p1', 'u1', true)

    expect(builder.insert).toHaveBeenCalledWith({ post_id: 'p1', user_id: 'u1' })
  })

  it('deletes the reaction when un-hearting', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await setForumPostHeart('p1', 'u1', false)

    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('post_id', 'p1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('throws a friendly error when the write fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(setForumPostHeart('p1', 'u1', true)).rejects.toThrow(
      'Could not add your heart. Please try again.'
    )
    await expect(setForumPostHeart('p1', 'u1', false)).rejects.toThrow(
      'Could not remove your heart. Please try again.'
    )
  })
})

describe('setForumCommentHeart', () => {
  it('inserts a reaction when hearting', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await setForumCommentHeart('c1', 'u1', true)

    expect(builder.insert).toHaveBeenCalledWith({ comment_id: 'c1', user_id: 'u1' })
  })

  it('deletes the reaction when un-hearting', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await setForumCommentHeart('c1', 'u1', false)

    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('comment_id', 'c1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('throws a friendly error when the write fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(setForumCommentHeart('c1', 'u1', true)).rejects.toThrow(
      'Could not add your heart. Please try again.'
    )
  })
})

describe('markForumPostEdited', () => {
  it('stamps updated_at on the given post', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-19T12:00:00Z'))
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await markForumPostEdited('p1')

    expect(builder.update).toHaveBeenCalledWith({
      updated_at: '2026-09-19T12:00:00.000Z',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
    vi.useRealTimers()
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(markForumPostEdited('p1')).rejects.toThrow(
      'Could not save the changes. Please try again.'
    )
  })
})

describe('uploadForumImage', () => {
  it('uploads to the uid-scoped path and inserts the image row', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ data: { id: 'img1' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      uploadForumImage({ file: EMPTY_FILE, postId: 'p1', userId: 'u1', position: 2 })
    ).resolves.toEqual({ id: 'img1', storage_path: 'u1/p1/2.jpg', position: 2 })

    expect(supabase.storage.from).toHaveBeenCalledWith('forum')
    expect(bucket.upload).toHaveBeenCalledWith('u1/p1/2.jpg', EMPTY_FILE, {
      contentType: 'image/jpeg',
      upsert: false,
    })
    expect(builder.insert).toHaveBeenCalledWith({
      post_id: 'p1',
      storage_path: 'u1/p1/2.jpg',
      position: 2,
    })
    expect(builder.select).toHaveBeenCalledWith('id')
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the upload fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      uploadForumImage({ file: EMPTY_FILE, postId: 'p1', userId: 'u1', position: 0 })
    ).rejects.toThrow('Could not upload the photo. Please try again.')
  })

  it('throws a friendly error when the image row insert fails', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      uploadForumImage({ file: EMPTY_FILE, postId: 'p1', userId: 'u1', position: 0 })
    ).rejects.toThrow('Could not save the photo. Please try again.')
  })
})

describe('deleteForumImage', () => {
  it('deletes the row then best-effort removes the storage object', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await deleteForumImage({ id: 'img1', storage_path: 'u1/p1/0.jpg', position: 0 })

    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('id', 'img1')
    expect(bucket.remove).toHaveBeenCalledWith(['u1/p1/0.jpg'])
  })

  it('still resolves when the storage cleanup fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(createQueryBuilder({ error: null }))

    await expect(
      deleteForumImage({ id: 'img1', storage_path: 'u1/p1/0.jpg', position: 0 })
    ).resolves.toBeUndefined()
  })

  it('throws a friendly error when the row delete fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      deleteForumImage({ id: 'img1', storage_path: 'u1/p1/0.jpg', position: 0 })
    ).rejects.toThrow('Could not remove the photo. Please try again.')
  })
})

describe('getForumImageUrl', () => {
  it('creates a signed URL from the forum bucket and caches it', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/forum/cache' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getForumImageUrl('cache/forum/0.jpg')).resolves.toBe(
      'https://signed.test/forum/cache'
    )
    await expect(getForumImageUrl('cache/forum/0.jpg')).resolves.toBe(
      'https://signed.test/forum/cache'
    )

    expect(supabase.storage.from).toHaveBeenCalledWith('forum')
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('cache/forum/0.jpg', 60)
  })

  it('throws a friendly error when signing fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getForumImageUrl('missing/forum/0.jpg')).rejects.toThrow(
      'Could not load the photo.'
    )
  })
})
