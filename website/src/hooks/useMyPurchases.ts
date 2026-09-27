import { useCallback, useEffect, useState } from 'react'
import { fetchMyPurchases, TRANSACTION_SORTS } from '../services/transactions'
import type { TransactionSort } from '../services/transactions'
import type { TransactionRow } from '../types/domain'

export const MY_PURCHASES_PAGE_SIZE = 12

export interface UseMyPurchasesParams {
  userId?: string
  sort?: TransactionSort
  page?: number
  limit?: number
}

export interface UseMyPurchasesResult {
  purchases: TransactionRow[]
  total: number
  isInitialLoading: boolean
  isPageLoading: boolean
  error: string
  retry: () => void
}

// Server-paged buyer transaction list; the caller owns the page and sort.
function useMyPurchases({
  userId,
  sort = TRANSACTION_SORTS.NEWEST,
  page = 1,
  limit = MY_PURCHASES_PAGE_SIZE,
}: UseMyPurchasesParams = {}): UseMyPurchasesResult {
  const [purchases, setPurchases] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!userId) {
        if (isCurrent) {
          setPurchases([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
          setIsPageLoading(false)
        }
        return
      }
      setIsPageLoading(true)
      try {
        const result = await fetchMyPurchases(userId, { sort, page, limit })
        if (isCurrent) {
          setPurchases(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your purchases. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsInitialLoading(false)
          setIsPageLoading(false)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [userId, sort, page, limit, refreshNonce])

  const retry = useCallback(() => {
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    purchases,
    total,
    isInitialLoading,
    isPageLoading,
    error,
    retry,
  }
}

export default useMyPurchases
