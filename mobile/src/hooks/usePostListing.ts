// Post-listing submission — a direct port of website/src/hooks/usePostListing.ts.
// Creates the listing row first, then uploads the photo; a failed upload rolls
// the row back with a soft delete so a photo-less post never appears in the
// marketplace. A successful post tells every listings surface to refresh.
import { useCallback, useState } from 'react'
import {
  createListing,
  softDeleteListing,
  uploadListingImage,
} from '../services/listings'
import type { ListingCategory, ListingUnit } from '../services/listings'
import { useAuth } from '../context/authContext'
import { notifyListingsChanged } from '../utils/listingEvents'
import { getDisplayName } from '../utils/userProfile'
import type { PreparedImage } from '../utils/image'

export interface PostListingInput {
  title: string
  description: string
  price: number
  unit: ListingUnit
  category: ListingCategory
  quantity: number | null
  lat: number
  lng: number
  locationLabel: string
  image: PreparedImage
}

export interface UsePostListingResult {
  postListing: (input: PostListingInput) => Promise<string>
  isSubmitting: boolean
  error: string
}

function usePostListing(): UsePostListingResult {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const postListing = useCallback(
    async ({
      title,
      description,
      price,
      unit,
      category,
      quantity,
      lat,
      lng,
      locationLabel,
      image,
    }: PostListingInput): Promise<string> => {
      if (!user) {
        throw new Error('You must be signed in to post a listing.')
      }
      setIsSubmitting(true)
      setError('')
      let listingId: string | null = null
      try {
        listingId = await createListing({
          userId: user.id,
          title,
          description,
          price,
          unit,
          category,
          quantity,
          lat,
          lng,
          locationLabel,
          sellerName: getDisplayName(user),
        })
        await uploadListingImage(image, listingId, user.id)
        notifyListingsChanged()
        return listingId
      } catch (err) {
        if (listingId) {
          // roll back the listing row so a failed upload never leaves a
          // photo-less post in the marketplace
          try {
            await softDeleteListing(listingId)
          } catch {
            // best effort; the original failure is the one surfaced below
          }
        }
        setError(
          err instanceof Error
            ? err.message
            : 'Could not post the listing. Please try again.'
        )
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [user]
  )

  return { postListing, isSubmitting, error }
}

export default usePostListing
