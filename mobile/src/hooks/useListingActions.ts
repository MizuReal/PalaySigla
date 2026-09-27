// Owner actions for a listing — reserve for a buyer, mark sold to a buyer,
// release a reservation, and soft-remove. Each action reports success so the
// screen can leave on completion (the web detail modal closes), keeps failures
// in an inline message instead of a toast (mobile has no toast layer), and
// notifies every listings surface when a mutation lands.
import { useCallback, useState } from 'react'
import {
  clearListingReservation,
  markListingSold,
  reserveListing,
  softDeleteListing,
} from '../services/listings'
import type { ListingBuyer } from '../services/listings'
import { notifyListingsChanged } from '../utils/listingEvents'

const RESERVE_FALLBACK = 'Could not reserve the listing. Please try again.'
const SOLD_FALLBACK = 'Could not mark the listing as sold. Please try again.'
const RELEASE_FALLBACK = 'Could not release the reservation. Please try again.'
const REMOVE_FALLBACK = 'Could not remove the listing. Please try again.'

export interface UseListingActionsResult {
  isActing: boolean
  error: string
  reserve: (id: string, buyer: ListingBuyer | null) => Promise<boolean>
  markSold: (id: string, buyer: ListingBuyer | null) => Promise<boolean>
  release: (id: string) => Promise<boolean>
  remove: (id: string) => Promise<boolean>
  clearError: () => void
}

function useListingActions(): UseListingActionsResult {
  const [isActing, setIsActing] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (action: () => Promise<void>, fallback: string): Promise<boolean> => {
      setIsActing(true)
      setError('')
      try {
        await action()
        notifyListingsChanged()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : fallback)
        return false
      } finally {
        setIsActing(false)
      }
    },
    []
  )

  const reserve = useCallback(
    (id: string, buyer: ListingBuyer | null) =>
      run(() => reserveListing(id, buyer), RESERVE_FALLBACK),
    [run]
  )

  const markSold = useCallback(
    (id: string, buyer: ListingBuyer | null) =>
      run(() => markListingSold(id, buyer), SOLD_FALLBACK),
    [run]
  )

  const release = useCallback(
    (id: string) => run(() => clearListingReservation(id), RELEASE_FALLBACK),
    [run]
  )

  const remove = useCallback(
    (id: string) => run(() => softDeleteListing(id), REMOVE_FALLBACK),
    [run]
  )

  const clearError = useCallback(() => setError(''), [])

  return { isActing, error, reserve, markSold, release, remove, clearError }
}

export default useListingActions
