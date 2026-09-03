// Resolves a listing image's short-lived signed URL for its storage path.
// Failures resolve to '' instead of throwing: the Photo component's
// fallback label covers failed or missing photos, exactly as the web
// ListingCard silently falls back.
import { useEffect, useState } from 'react'
import { getListingImageUrl } from '../services/listings.js'

function useListingImageUrl(storagePath) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    if (!storagePath) {
      return undefined
    }
    getListingImageUrl(storagePath)
      .then((url) => {
        if (isCurrent) {
          setImageUrl(url)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setImageUrl('')
        }
      })
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  return imageUrl
}

export default useListingImageUrl
