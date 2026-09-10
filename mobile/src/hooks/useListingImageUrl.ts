// Resolves a listing image's short-lived signed URL for its storage path.
// Failures resolve to '' instead of throwing: the Photo component's
// fallback label covers failed or missing photos, exactly as the web
// ListingCard silently falls back.
import { useEffect, useState } from 'react'
import { getListingImageUrl } from '../services/listings'

function useListingImageUrl(storagePath: string): string {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    if (!storagePath) {
      return undefined
    }
    const loadImageUrl = async () => {
      try {
        const url = await getListingImageUrl(storagePath)
        if (isCurrent) {
          setImageUrl(url)
        }
      } catch {
        if (isCurrent) {
          setImageUrl('')
        }
      }
    }
    loadImageUrl()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  return imageUrl
}

export default useListingImageUrl
