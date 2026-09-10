import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock.js'

vi.mock('../supabaseClient.js', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import {
  fetchProfile,
  getAvatarStoragePath,
  getAvatarUrl,
  getOwnAvatarUrl,
  removeAvatar,
  syncProfileName,
  uploadAvatar,
  upsertProfile,
} from '../profile.js'

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getAvatarStoragePath', () => {
  it('builds the user-scoped avatar path', () => {
    expect(getAvatarStoragePath('u1')).toBe('u1/avatar.jpg')
  })
})

describe('fetchProfile', () => {
  it('reads the live profile row for the user', async () => {
    const row = { id: 'fetch-user', full_name: 'Juan', phone: null }
    const builder = createQueryBuilder({ data: row, error: null })
    supabase.from.mockReturnValue(builder)

    await expect(fetchProfile('fetch-user')).resolves.toEqual(row)

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(builder.select).toHaveBeenCalledWith('*')
    expect(builder.eq).toHaveBeenCalledWith('id', 'fetch-user')
    expect(builder.is).toHaveBeenCalledWith('deleted_at', null)
    expect(builder.maybeSingle).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the read fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    await expect(fetchProfile('u1')).rejects.toThrow(
      'Could not load your profile. Please try again.'
    )
  })
})

describe('upsertProfile', () => {
  it('normalizes empty phone to null and omits an unchanged avatar path', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await upsertProfile('u1', { fullName: 'Juan', phone: '', avatarPath: undefined })

    expect(builder.upsert).toHaveBeenCalledWith(
      { id: 'u1', full_name: 'Juan', phone: null },
      { onConflict: 'id' }
    )
  })

  it('includes the avatar path when one is provided', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await upsertProfile('u1', {
      fullName: 'Juan',
      phone: '0917 123 4567',
      avatarPath: 'u1/avatar.jpg',
    })

    expect(builder.upsert).toHaveBeenCalledWith(
      { id: 'u1', full_name: 'Juan', phone: '0917 123 4567', avatar_path: 'u1/avatar.jpg' },
      { onConflict: 'id' }
    )
  })

  it('passes an explicit null avatar path through', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await upsertProfile('u1', { fullName: 'Juan', phone: null, avatarPath: null })

    expect(builder.upsert).toHaveBeenCalledWith(
      { id: 'u1', full_name: 'Juan', phone: null, avatar_path: null },
      { onConflict: 'id' }
    )
  })

  it('throws a friendly error when the upsert fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(upsertProfile('u1', { fullName: 'Juan' })).rejects.toThrow(
      'Could not save your profile. Please try again.'
    )
  })
})

describe('syncProfileName', () => {
  it('mirrors the display name into auth metadata', async () => {
    await syncProfileName('Juan')

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Juan' } })
  })

  it('throws a friendly error when the sync fails', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(syncProfileName('Juan')).rejects.toThrow(
      'Your profile saved, but your display name could not be synced. Please try again.'
    )
  })
})

describe('uploadAvatar', () => {
  it('uploads with upsert to the user avatar path and returns it', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const file = { name: 'photo.jpg' }

    await expect(uploadAvatar('upload-user', file)).resolves.toBe('upload-user/avatar.jpg')

    expect(supabase.storage.from).toHaveBeenCalledWith('avatars')
    expect(bucket.upload).toHaveBeenCalledWith('upload-user/avatar.jpg', file, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  })

  it('throws a friendly error when the upload fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadAvatar('u1', {})).rejects.toThrow(
      'Could not upload your photo. Please try again.'
    )
  })

  it('invalidates the cached avatar path so the fresh upload is visible', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/old' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    const builderOld = createQueryBuilder({
      data: { avatar_path: 'invalidate-user/avatar.jpg' },
      error: null,
    })
    supabase.from.mockReturnValue(builderOld)
    await getOwnAvatarUrl('invalidate-user')

    const builderNew = createQueryBuilder({
      data: { avatar_path: 'invalidate-user/avatar.jpg' },
      error: null,
    })
    supabase.from.mockReturnValue(builderNew)
    await uploadAvatar('invalidate-user', {})
    await getOwnAvatarUrl('invalidate-user')

    expect(supabase.from).toHaveBeenCalledTimes(2)
  })
})

describe('removeAvatar', () => {
  it('removes the stored object', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await removeAvatar('remove-user/avatar.jpg')

    expect(bucket.remove).toHaveBeenCalledWith(['remove-user/avatar.jpg'])
  })

  it('throws a friendly error when the removal fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(removeAvatar('u1/avatar.jpg')).rejects.toThrow(
      'Could not remove your photo. Please try again.'
    )
  })
})

describe('getOwnAvatarUrl', () => {
  it('returns a signed URL when the user has an avatar', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/own' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: { avatar_path: 'own-user/avatar.jpg' }, error: null })
    )

    await expect(getOwnAvatarUrl('own-user')).resolves.toBe('https://signed.test/own')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('own-user/avatar.jpg', 60)
  })

  it('returns an empty string when no avatar is stored', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: { avatar_path: null }, error: null })
    )

    await expect(getOwnAvatarUrl('no-avatar-user')).resolves.toBe('')
  })

  it('caches the path lookup per user', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ data: { avatar_path: null }, error: null })
    )

    await getOwnAvatarUrl('cached-user')
    await getOwnAvatarUrl('cached-user')

    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when the lookup fails', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    await expect(getOwnAvatarUrl('error-user')).rejects.toThrow(
      'Could not load your profile photo.'
    )
  })
})

describe('getAvatarUrl', () => {
  it('caches signed URLs within the TTL', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/cached' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getAvatarUrl('cache-user/avatar.jpg')).resolves.toBe(
      'https://signed.test/cached'
    )
    await expect(getAvatarUrl('cache-user/avatar.jpg')).resolves.toBe(
      'https://signed.test/cached'
    )

    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)
  })

  it('throws a friendly error when signing fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getAvatarUrl('error-user/avatar.jpg')).rejects.toThrow(
      'Could not load your profile photo.'
    )
  })
})
