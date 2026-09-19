// Owner actions for a listing — mark as sold and soft-remove. Each action
// reports success so the screen can leave on completion (the web detail modal
// closes), keeps failures in an inline message instead of a toast (mobile has
// no toast layer), and notifies every listings surface when a mutation lands.
import { useCallback, useState } from 'react'
import { LISTING_STATUSES, softDeleteListing, updateListingStatus } from '../services/listings'
import { notifyListingsChanged } from '../utils/listingEvents'

const UPDATE_FALLBACK = 'Could not update the listing. Please try again.'
const REMOVE_FALLBACK = 'Could not remove the listing. Please try again.'

export interface UseListingActionsResult {
  isActing: boolean
  error: string
  markSold: (id: string) => Promise<boolean>
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

  const markSold = useCallback(
    (id: string) =>
      run(() => updateListingStatus(id, LISTING_STATUSES.SOLD), UPDATE_FALLBACK),
    [run]
  )

  const remove = useCallback(
    (id: string) => run(() => softDeleteListing(id), REMOVE_FALLBACK),
    [run]
  )

  const clearError = useCallback(() => setError(''), [])

  return { isActing, error, markSold, remove, clearError }
}

export default useListingActions
