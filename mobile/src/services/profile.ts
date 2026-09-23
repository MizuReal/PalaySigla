// Profile data access — port of website/src/services/profile.ts. Avatar bytes
// upload from the compressed image's base64 payload (RN-safe), and signed URLs
// ride the shared cache; a per-user path cache avoids re-querying on each visit.
import { supabase } from './supabaseClient'
import { getSignedImageUrl } from './signedUrlCache'
import { decodePreparedImage } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import type { TablesInsert } from '../types/database'
import type { ProfileRow } from '../types/domain'

const AVATAR_BUCKET = 'avatars'
const AVATAR_FILE_NAME = 'avatar.jpg'
const AVATAR_PATH_CACHE_TTL_MS = 60_000

const avatarPathCache = new Map<string, { path: string; fetchedAt: number }>()

export interface UpsertProfileInput {
  fullName: string
  phone: string | null
  avatarPath?: string | null
}

export function getAvatarStoragePath(userId: string): string {
  return `${userId}/${AVATAR_FILE_NAME}`
}

function userIdFromStoragePath(storagePath: string): string {
  return storagePath.split('/')[0]
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    throw new Error('Could not load your profile. Please try again.')
  }
  return data
}

export async function upsertProfile(
  userId: string,
  { fullName, phone, avatarPath }: UpsertProfileInput
): Promise<void> {
  const fields: TablesInsert<'profiles'> = {
    id: userId,
    full_name: fullName,
    phone: phone || null,
  }
  if (avatarPath !== undefined) {
    fields.avatar_path = avatarPath
  }
  const { error } = await supabase
    .from('profiles')
    .upsert(fields, { onConflict: 'id' })
  if (error) {
    throw new Error('Could not save your profile. Please try again.')
  }
}

// keeps the signed-in user's auth metadata in sync so the display name shown
// across the app reflects the name edited here
export async function syncProfileName(fullName: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })
  if (error) {
    throw new Error(
      'Your profile saved, but your display name could not be synced. Please try again.'
    )
  }
}

export async function uploadAvatar(
  userId: string,
  image: PreparedImage
): Promise<string> {
  const storagePath = getAvatarStoragePath(userId)
  const bytes = decodePreparedImage(image)
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: true })
  if (error) {
    throw new Error('Could not upload your photo. Please try again.')
  }
  // a stale cached "no avatar" path would hide the fresh upload for TTL seconds
  avatarPathCache.delete(userId)
  return storagePath
}

export async function removeAvatar(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([storagePath])
  if (error) {
    throw new Error('Could not remove your photo. Please try again.')
  }
  // drop the path cache so nothing resolves the removed object again
  avatarPathCache.delete(userIdFromStoragePath(storagePath))
}

// minimal column read, cached per user, then delegated to the shared signed URL
// cache — used by the account surface to show the current avatar
export async function getOwnAvatarUrl(userId: string): Promise<string> {
  const cached = avatarPathCache.get(userId)
  if (cached && cached.fetchedAt > Date.now() - AVATAR_PATH_CACHE_TTL_MS) {
    return cached.path ? getAvatarUrl(cached.path) : ''
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('avatar_path')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) {
    throw new Error('Could not load your profile photo.')
  }
  const path = data?.avatar_path ?? ''
  avatarPathCache.set(userId, { path, fetchedAt: Date.now() })
  return path ? getAvatarUrl(path) : ''
}

export async function getAvatarUrl(storagePath: string): Promise<string> {
  return getSignedImageUrl(AVATAR_BUCKET, storagePath, 'Could not load your profile photo.')
}
