import { useCallback, useEffect, useState } from 'react'
import { fetchUserReviews } from '../services/reviews'
import { subscribeToReviewsChanged } from '../utils/reviewEvents'
import type { ReviewRow } from '../types/domain'

const PAGE_SIZE = 10

export interface UseUserReviewsResult {
  reviews: ReviewRow[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
}

// Public reviews received by a user, newest first.
function useUserReviews(userId: string | null): UseUserReviewsResult {
  const [reviews, setReviews] = useState<ReviewRow[]>([])
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
          setReviews([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
        return
      }
      try {
        const result = await fetchUserReviews(userId, { page: 1, limit: PAGE_SIZE })
        if (isCurrent) {
          setReviews(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Could not load reviews. Please try again.'
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
    const unsubscribe = subscribeToReviewsChanged(() =>
      setRefreshNonce((current) => current + 1)
    )
    return () => {
      isCurrent = false
      unsubscribe()
    }
  }, [userId, refreshNonce])

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || reviews.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchUserReviews(userId, { page: nextPage, limit: PAGE_SIZE })
      setReviews((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load reviews. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [userId, isLoadingMore, reviews.length, total, page])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    reviews,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: reviews.length < total,
  }
}

export default useUserReviews
