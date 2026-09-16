import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder, resetSupabaseMock } from '../../test/supabaseMock'
import type { SupabaseMock } from '../../test/supabaseMock'

vi.mock('../supabaseClient', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient'
import {
  createForumComment,
  createForumPost,
  fetchForumComments,
  fetchForumPosts,
  fetchMyCommentHeartIds,
  fetchMyPostHeartIds,
  getForumPost,
  setForumCommentHeart,
  setForumPostHeart,
  softDeleteForumComment,
  softDeleteForumPost,
  updateForumComment,
  updateForumPost,
} from '../forum'

// vi.mock swaps in a mock instance; the real SupabaseClient type exposes no mock helpers
const supabase = supabaseClient as unknown as SupabaseMock

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
    expect(postsBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' })
    expect(postsBuilder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(postsBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(postsBuilder.range).toHaveBeenCalledWith(0, 9)
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
    expect(postBuilder.eq).toHaveBeenCalledWith('id', 'p1')
    expect(postBuilder.is).toHaveBeenCalledWith('deleted_at', null)
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
      })
    ).resolves.toBe('new-id')

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      author_name: 'Juan',
      title: 'Question',
      body: 'Body',
    })
    expect(builder.select).toHaveBeenCalledWith('id')
    expect(builder.single).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the insert fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(
      createForumPost({ userId: 'u1', authorName: 'Juan', title: 'T', body: 'B' })
    ).rejects.toThrow('Could not publish the discussion. Please try again.')
  })
})

describe('updateForumPost', () => {
  it('updates the content of the given post', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await updateForumPost({ postId: 'p1', title: ' T ', body: ' B ' })

    expect(builder.update).toHaveBeenCalledWith({ title: 'T', body: 'B' })
    expect(builder.eq).toHaveBeenCalledWith('id', 'p1')
  })

  it('throws a friendly error when the update fails', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(updateForumPost({ postId: 'p1', title: 'T', body: 'B' })).rejects.toThrow(
      'Could not save the changes. Please try again.'
    )
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
