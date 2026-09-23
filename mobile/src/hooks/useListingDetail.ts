// Single-listing loader for the detail screen — ported from the website's
// useListingDetail hook. Retrying a failed load is handled by the screen
// remounting the component that owns this hook (keyed by a retry counter),
// so the effect only ever runs for a fresh id. A failed photo resolution does
// not fail the screen: the listing still renders and the Photo fallback
// covers the missing image.
import { useEffect, useState } from 'react'
import { getListing, getListingImageUrl } from '../services/listings'
import type { ListingWithImages } from '../types/domain'

export interface UseListingDetailResult {
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  error: string
}

function useListingDetail(id: string): UseListingDetailResult {
  const [listing, setListing] = useState<ListingWithImages | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      let result: ListingWithImages
      try {
        result = await getListing(id)
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'That listing could not be found.'
          )
          setIsLoading(false)
        }
        return
      }
      if (!isCurrent) {
        return
      }
      setListing(result)
      setError('')

      const firstImage = result.listing_images?.[0]
      if (firstImage) {
        try {
          const url = await getListingImageUrl(firstImage.storage_path)
          if (isCurrent) {
            setImageUrl(url)
          }
        } catch {
          // the listing data is still valid; the Photo fallback covers the
          // image, so a signed-URL failure never blanks the whole screen
          if (isCurrent) {
            setImageUrl('')
          }
        }
      }
      if (isCurrent) {
        setIsLoading(false)
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [id])

  return { listing, imageUrl, isLoading, error }
}

export default useListingDetail

