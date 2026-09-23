// Resolves a listing image's short-lived signed URL for its storage path.
// Exposes a truthful status so callers never leave a blank frame while a
// resolution is pending: `isLoading` covers the fetch, and a failure surfaces
// as `hasError` with an empty url so the Photo fallback renders. The hook
// never throws; the Photo component owns the user-facing fallback label,
// exactly as the web ListingCard falls back silently.
//
// State is keyed to the path's presence and updated only from the async
// resolution, so the effect never sets state synchronously. Listings are
// immutable and their rows keyed by id, so a mounted path does not change.
import { useEffect, useState } from 'react'
import { getListingImageUrl } from '../services/listings'

export interface UseListingImageUrlResult {
  url: string
  isLoading: boolean
  hasError: boolean
}

function useListingImageUrl(storagePath: string): UseListingImageUrlResult {
  const [state, setState] = useState<UseListingImageUrlResult>(() =>
    storagePath
      ? { url: '', isLoading: true, hasError: false }
      : { url: '', isLoading: false, hasError: false }
  )

  useEffect(() => {
    if (!storagePath) {
      return undefined
    }
    let isCurrent = true
    const loadImageUrl = async () => {
      try {
        const resolved = await getListingImageUrl(storagePath)
        if (isCurrent) {
          setState({ url: resolved, isLoading: false, hasError: false })
        }
      } catch {
        if (isCurrent) {
          setState({ url: '', isLoading: false, hasError: true })
        }
      }
    }
    loadImageUrl()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  return state
}

export default useListingImageUrl
