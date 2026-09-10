import { useEffect, useState } from 'react'
import { getListing, getListingImageUrl } from '../services/listings.js'
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
      try {
        const result = await getListing(id)
        if (!isCurrent) {
          return
        }
        setListing(result)
        const url = result.listing_images?.[0]
          ? await getListingImageUrl(result.listing_images[0].storage_path)
          : ''
        if (isCurrent) {
          setImageUrl(url)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'That listing could not be found.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
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
