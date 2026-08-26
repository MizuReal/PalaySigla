import { useCallback, useState } from 'react'
import {
  createListing,
  softDeleteListing,
  uploadListingImage,
} from '../services/listings.js'
import { useAuth } from '../context/authContext.js'
import { getDisplayName } from '../utils/userProfile.js'

function usePostListing() {
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
    }) => {
      if (!user) {
        throw new Error('You must be signed in to post a listing.')
      }
      setIsSubmitting(true)
      setError('')
      let listingId = null
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
          await softDeleteListing(listingId).catch(() => undefined)
        }
        setError(err.message)
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
