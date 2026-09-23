// Shared signed-URL cache for private storage buckets (listings, forum,
// avatars). Direct port of website/src/services/signedUrlCache.ts: URLs are
// valid for 60s server-side and cached 45s client-side, so a fresh URL is
// always served while never refetching on every render.
import { supabase } from './supabaseClient'

const SIGNED_URL_TTL_SECONDS = 60
const CACHE_TTL_MS = 45_000

const signedUrlCache = new Map<string, { url: string; fetchedAt: number }>()

export async function getSignedImageUrl(
  bucket: string,
  storagePath: string,
  errorMessage: string
): Promise<string> {
  const cacheKey = `${bucket}:${storagePath}`
  const cached = signedUrlCache.get(cacheKey)
  if (cached && cached.fetchedAt > Date.now() - CACHE_TTL_MS) {
    return cached.url
  }
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)
  if (error) {
    throw new Error(errorMessage)
  }
  signedUrlCache.set(cacheKey, { url: data.signedUrl, fetchedAt: Date.now() })
  return data.signedUrl
}
