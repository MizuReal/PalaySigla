import { useCallback, useState } from 'react'
import {
  createListing,
  softDeleteListing,
  uploadListingImage,
} from '../services/listings.js'
import type { ListingCategory, ListingUnit } from '../services/listings.js'
import { useAuth } from '../context/authContext.js'
import { getDisplayName } from '../utils/userProfile.js'

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
  imageFile: Blob
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
      imageFile,
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
        await uploadListingImage(imageFile, listingId, user.id)
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
          err instanceof Error ? err.message : 'Could not post the listing. Please try again.'
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
