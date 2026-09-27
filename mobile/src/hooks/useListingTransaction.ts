import { useEffect, useState } from 'react'
import { fetchListingTransaction } from '../services/transactions'
import type { TransactionRow } from '../types/domain'

export interface UseListingTransactionResult {
  transaction: TransactionRow | null
  isLoading: boolean
}

// Best-effort live transaction for a listing thread. RLS yields null for
// non-participants, and a read failure simply hides the banner.
function useListingTransaction(listingId: string | null): UseListingTransactionResult {
  const [transaction, setTransaction] = useState<TransactionRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!listingId) {
        if (isCurrent) {
          setTransaction(null)
          setIsLoading(false)
        }
        return
      }
      setIsLoading(true)
      try {
        const result = await fetchListingTransaction(listingId)
        if (isCurrent) {
          setTransaction(result)
        }
      } catch {
        if (isCurrent) {
          setTransaction(null)
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
  }, [listingId])

  return { transaction, isLoading }
}

export default useListingTransaction
