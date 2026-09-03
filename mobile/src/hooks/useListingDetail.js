// Single-listing loader for the detail screen — ported from the website's
// useListingDetail hook. Retrying a failed load is handled by the screen
// remounting the component that owns this hook (keyed by a retry counter),
// so the effect only ever runs for a fresh id.
import { useEffect, useState } from 'react'
import { getListing, getListingImageUrl } from '../services/listings.js'

function useListingDetail(id) {
  const [listing, setListing] = useState(null)
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
          setError(err.message)
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
