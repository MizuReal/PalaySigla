/// <reference types="jest" />
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import {
  createForumPost,
  fetchForumCategoryCounts,
  setForumPostHeart,
  uploadForumImage,
} from '../forum'

const supabase = supabaseClient as unknown as SupabaseMock

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('createForumPost', () => {
  it('inserts a trimmed post and returns the id', async () => {
    const builder = createQueryBuilder({ data: { id: 'P1' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      createForumPost({
        userId: 'u1',
        authorName: 'Juan',
        title: '  Wet palay  ',
        body: '  Help  ',
        category: 'storage',
      })
    ).resolves.toBe('P1')

    expect(supabase.from).toHaveBeenCalledWith('forum_posts')
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      author_name: 'Juan',
      title: 'Wet palay',
      body: 'Help',
      category: 'storage',
    })
  })

  it('throws a friendly error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(
      createForumPost({
        userId: 'u1',
        authorName: 'Juan',
        title: 'Title',
        body: 'Body',
        category: 'general',
      })
    ).rejects.toThrow('Could not publish the discussion. Please try again.')
  })
})

describe('uploadForumImage', () => {
  const IMAGE = {
    uri: 'file:///cache/prepared.jpg',
    width: 1600,
    height: 1200,
    base64: 'ZmFrZQ==',
  }

  it('decodes the base64, uploads under the owner path, and records the row', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ data: { id: 'IMG1' }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(
      uploadForumImage({ image: IMAGE, postId: 'P1', userId: 'u1', position: 0 })
    ).resolves.toEqual({ id: 'IMG1', storage_path: 'u1/P1/0.jpg', position: 0 })

    expect(supabase.storage.from).toHaveBeenCalledWith('forum')
    expect(bucket.upload).toHaveBeenCalledWith('u1/P1/0.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: false,
    })
    expect(builder.insert).toHaveBeenCalledWith({
      post_id: 'P1',
      storage_path: 'u1/P1/0.jpg',
      position: 0,
    })
  })

  it('rejects an empty payload before uploading', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      uploadForumImage({
        image: { ...IMAGE, base64: '' },
        postId: 'P1',
        userId: 'u1',
        position: 0,
      })
    ).rejects.toThrow('The photo could not be read. Please choose it again.')
    expect(bucket.upload).not.toHaveBeenCalled()
  })
})

describe('setForumPostHeart', () => {
  it('inserts a reaction when hearting', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await setForumPostHeart('P1', 'u1', true)

    expect(supabase.from).toHaveBeenCalledWith('forum_reactions')
    expect(builder.insert).toHaveBeenCalledWith({ post_id: 'P1', user_id: 'u1' })
  })

  it('deletes the reaction when un-hearting', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await setForumPostHeart('P1', 'u1', false)

    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('post_id', 'P1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})

describe('fetchForumCategoryCounts', () => {
  it('zero-fills the seven categories and ignores unknown rows', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { category: 'general', post_count: 2 },
        { category: 'storage', post_count: 5 },
        { category: 'bogus', post_count: 9 },
      ],
      error: null,
    })

    await expect(fetchForumCategoryCounts()).resolves.toEqual({
      general: 2,
      planting: 0,
      pests: 0,
      harvesting: 0,
      storage: 5,
      quality: 0,
      market: 0,
    })
    expect(supabase.rpc).toHaveBeenCalledWith('forum_category_counts')
  })

  it('throws a friendly error when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchForumCategoryCounts()).rejects.toThrow(
      'Could not load categories. Please try again.'
    )
  })
})
