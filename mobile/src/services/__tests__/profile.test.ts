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
  fetchProfile,
  getOwnAvatarUrl,
  removeAvatar,
  syncProfileName,
  uploadAvatar,
  upsertProfile,
} from '../profile'

const supabase = supabaseClient as unknown as SupabaseMock

const IMAGE = {
  uri: 'file:///cache/avatar.jpg',
  width: 512,
  height: 512,
  base64: 'ZmFrZQ==',
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('fetchProfile', () => {
  it('returns the profile row', async () => {
    const row = { id: 'u1', full_name: 'Juan' }
    const builder = createQueryBuilder({ data: row, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchProfile('u1')).resolves.toEqual(row)
    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
  })

  it('throws a friendly error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'boom' } })
    supabase.from.mockReturnValue(builder)

    await expect(fetchProfile('u1')).rejects.toThrow(
      'Could not load your profile. Please try again.'
    )
  })
})

describe('upsertProfile', () => {
  it('upserts the name/phone and optional avatar path', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await upsertProfile('u1', { fullName: 'Juan', phone: '+639171234567' })

    expect(builder.upsert).toHaveBeenCalledWith(
      { id: 'u1', full_name: 'Juan', phone: '+639171234567' },
      { onConflict: 'id' }
    )
    expect((builder.upsert as jest.Mock).mock.calls[0][0]).not.toHaveProperty(
      'avatar_path'
    )
  })

  it('writes avatar_path when provided (including null)', async () => {
    const builder = createQueryBuilder({ data: null, error: null })
    supabase.from.mockReturnValue(builder)

    await upsertProfile('u1', { fullName: 'Juan', phone: null, avatarPath: null })

    expect((builder.upsert as jest.Mock).mock.calls[0][0]).toHaveProperty(
      'avatar_path',
      null
    )
  })
})

describe('uploadAvatar', () => {
  it('decodes the base64 and upserts the object at the owner path', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadAvatar('u1', IMAGE)).resolves.toBe('u1/avatar.jpg')

    expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
    expect(bucket.upload).toHaveBeenCalledWith('u1/avatar.jpg', expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
      upsert: true,
    })
  })

  it('rejects an empty payload', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadAvatar('u1', { ...IMAGE, base64: '' })).rejects.toThrow(
      'The photo could not be read. Please choose it again.'
    )
    expect(bucket.upload).not.toHaveBeenCalled()
  })
})

describe('removeAvatar / syncProfileName', () => {
  it('removes the object from the avatars bucket', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await removeAvatar('u1/avatar.jpg')

    expect(bucket.remove).toHaveBeenCalledWith(['u1/avatar.jpg'])
  })

  it('syncs the auth display name', async () => {
    await syncProfileName('Juan dela Cruz')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Juan dela Cruz' },
    })
  })
})

describe('getOwnAvatarUrl', () => {
  it('resolves the signed URL from the cached path', async () => {
    const builder = createQueryBuilder({ data: { avatar_path: 'u2/avatar.jpg' }, error: null })
    supabase.from.mockReturnValue(builder)
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/u2' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getOwnAvatarUrl('u2')).resolves.toBe('https://signed.test/u2')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('u2/avatar.jpg', 60)
  })

  it('returns an empty string when the profile has no avatar', async () => {
    const builder = createQueryBuilder({ data: { avatar_path: null }, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(getOwnAvatarUrl('u3')).resolves.toBe('')
  })
})
