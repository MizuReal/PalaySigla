import { supabase } from './supabaseClient.js'

const AVATAR_BUCKET = 'avatars'
const AVATAR_FILE_NAME = 'avatar.jpg'
const SIGNED_URL_TTL_SECONDS = 60
const SIGNED_URL_CACHE_TTL_MS = 45_000
const AVATAR_PATH_CACHE_TTL_MS = 60_000

const signedUrlCache = new Map()
const avatarPathCache = new Map()

export function getAvatarStoragePath(userId) {
  return `${userId}/${AVATAR_FILE_NAME}`
}

function userIdFromStoragePath(storagePath) {
  return storagePath.split('/')[0]
}

function clearAvatarCaches(storagePath) {
  signedUrlCache.delete(storagePath)
  avatarPathCache.delete(userIdFromStoragePath(storagePath))
}

export async function fetchProfile(userId) {
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

export async function upsertProfile(userId, { fullName, phone, avatarPath }) {
  const fields = {
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

// keeps the signed-in user's auth metadata in sync so the nav chip and the
// mobile settings screen reflect the name edited here
export async function syncProfileName(fullName) {
  const { error } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  })
  if (error) {
    throw new Error('Your profile saved, but your display name could not be synced. Please try again.')
  }
}

export async function uploadAvatar(userId, file) {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(getAvatarStoragePath(userId), file, {
      contentType: 'image/jpeg',
      upsert: true,
    })
  if (error) {
    throw new Error('Could not upload your photo. Please try again.')
  }
  // a stale cached "no avatar" path would hide the fresh upload for TTL seconds
  avatarPathCache.delete(userId)
  return getAvatarStoragePath(userId)
}

export async function removeAvatar(storagePath) {
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .remove([storagePath])
  if (error) {
    throw new Error('Could not remove your photo. Please try again.')
  }
  // drop both caches so nothing serves a signed URL for the removed object
  clearAvatarCaches(storagePath)
}

// navbar/profile-chip lookup: minimal column read, cached per user for the
// session so page-to-page navigation does not re-query Supabase every time
export async function getOwnAvatarUrl(userId) {
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

export async function getAvatarUrl(storagePath) {
  const cached = signedUrlCache.get(storagePath)
  if (cached && cached.fetchedAt > Date.now() - SIGNED_URL_CACHE_TTL_MS) {
    return cached.url
  }
  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) {
    throw new Error('Could not load your profile photo.')
  }
  signedUrlCache.set(storagePath, { url: data.signedUrl, fetchedAt: Date.now() })
  return data.signedUrl
}
