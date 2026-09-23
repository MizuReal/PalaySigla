/// <reference types="jest" />
import { createStorageBucketMock, resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import { getSignedImageUrl } from '../signedUrlCache'

const supabase = supabaseClient as unknown as SupabaseMock

const ERROR_MESSAGE = 'Could not load the photo.'

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('getSignedImageUrl', () => {
  it('creates a signed URL and serves it from cache within the TTL', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/forum/0.jpg' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getSignedImageUrl('forum', 'u1/p1/0.jpg', ERROR_MESSAGE)).resolves.toBe(
      'https://signed.test/forum/0.jpg'
    )
    await expect(getSignedImageUrl('forum', 'u1/p1/0.jpg', ERROR_MESSAGE)).resolves.toBe(
      'https://signed.test/forum/0.jpg'
    )

    expect(supabase.storage.from).toHaveBeenCalledWith('forum')
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('u1/p1/0.jpg', 60)
  })

  it('caches per bucket and path', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/x' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await getSignedImageUrl('forum', 'u2/p2/0.jpg', ERROR_MESSAGE)
    await getSignedImageUrl('avatars', 'u2/avatar.jpg', ERROR_MESSAGE)

    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(2)
  })

  it('refetches once the cache TTL has elapsed', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/expiry' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    const base = 1_800_000_000_000
    const nowSpy = jest.spyOn(Date, 'now')
    nowSpy.mockReturnValue(base)

    await getSignedImageUrl('forum', 'expiry/0.jpg', ERROR_MESSAGE)
    nowSpy.mockReturnValue(base + 10_000)
    await getSignedImageUrl('forum', 'expiry/0.jpg', ERROR_MESSAGE)
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)

    nowSpy.mockReturnValue(base + 46_000)
    await getSignedImageUrl('forum', 'expiry/0.jpg', ERROR_MESSAGE)
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(2)
  })

  it('throws the caller-supplied message on failure', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getSignedImageUrl('forum', 'missing/0.jpg', ERROR_MESSAGE)).rejects.toThrow(
      ERROR_MESSAGE
    )
  })
})
