import { useCallback, useEffect, useState } from 'react'
import { fetchMySales } from '../services/transactions'
import type { TransactionRow } from '../types/domain'

const PAGE_SIZE = 20

export interface UseMySalesResult {
  sales: TransactionRow[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
}

// Paginated buyer-side transaction list; mirrors useMyListings.
function useMySales(userId?: string): UseMySalesResult {
  const [sales, setSales] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const loadFirstPage = async () => {
      if (!userId) {
        if (isCurrent) {
          setSales([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
        return
      }
      try {
        const result = await fetchMySales(userId, { page: 1, limit: PAGE_SIZE })
        if (isCurrent) {
          setSales(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Could not load your sales. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
      }
    }
    loadFirstPage()
    return () => {
      isCurrent = false
    }
  }, [userId, refreshNonce])

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || sales.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchMySales(userId, { page: nextPage, limit: PAGE_SIZE })
      setSales((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load your sales. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [userId, isLoadingMore, sales.length, total, page])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    sales,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: sales.length < total,
  }
}

export default useMySales
