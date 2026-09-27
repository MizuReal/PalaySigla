import { useEffect, useState } from 'react'
import { getListing, getListingImageUrl } from '../services/listings'
import type { ConversationRow, ListingWithImages } from '../types/domain'

export interface UseConversationListingResult {
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  isUnavailable: boolean
}

// Product context for a listing conversation. The title renders from the
// conversation snapshot immediately; the photo/price/category are enriched
// from the live listing. A soft-deleted or unreadable listing degrades to
// `isUnavailable` rather than surfacing an error into the thread.
function useConversationListing(
  conversation: ConversationRow | null
): UseConversationListingResult {
  const listingId = conversation?.listing_id ?? null
  const [listing, setListing] = useState<ListingWithImages | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!listingId) {
        if (isCurrent) {
          setListing(null)
          setImageUrl('')
          setHasFailed(false)
        }
        return
      }
      try {
        const result = await getListing(listingId)
        const url = result.listing_images?.[0]
          ? await getListingImageUrl(result.listing_images[0].storage_path)
          : ''
        if (isCurrent) {
          setListing(result)
          setImageUrl(url)
          setHasFailed(false)
        }
      } catch {
        if (isCurrent) {
          setListing(null)
          setImageUrl('')
          setHasFailed(true)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [listingId])

  return {
    listing,
    imageUrl,
    // derived so the pre-fetch frame reads as loading, not unavailable
    isLoading: listingId !== null && listing === null && !hasFailed,
    isUnavailable: listingId !== null && hasFailed,
  }
}

export default useConversationListing
