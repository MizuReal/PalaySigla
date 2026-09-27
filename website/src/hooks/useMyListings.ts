import { useCallback, useEffect, useState } from 'react'
import {
  fetchMyListings,
  MY_LISTING_FILTERS,
  MY_LISTING_SORTS,
} from '../services/listings'
import type { MyListingFilter, MyListingSort } from '../services/listings'
import type { MyListingWithTransaction } from '../types/domain'

export const MY_LISTINGS_PAGE_SIZE = 12

export interface UseMyListingsParams {
  userId?: string
  filter?: MyListingFilter
  sort?: MyListingSort
  page?: number
  limit?: number
  refreshKey?: number
}

export interface UseMyListingsResult {
  listings: MyListingWithTransaction[]
  total: number
  isInitialLoading: boolean
  isPageLoading: boolean
  error: string
  retry: () => void
}

// Server-paged owner listing history; the caller owns the page and sort so the
// table's pagination state stays the single source of truth.
function useMyListings({
  userId,
  filter = MY_LISTING_FILTERS.ALL,
  sort = MY_LISTING_SORTS.NEWEST,
  page = 1,
  limit = MY_LISTINGS_PAGE_SIZE,
  refreshKey = 0,
}: UseMyListingsParams = {}): UseMyListingsResult {
  const [listings, setListings] = useState<MyListingWithTransaction[]>([])
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
          setListings([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
          setIsPageLoading(false)
        }
        return
      }
      setIsPageLoading(true)
      try {
        const result = await fetchMyListings({ userId, filter, sort, page, limit })
        if (isCurrent) {
          setListings(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load your listings. Please try again.'
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
  }, [userId, filter, sort, page, limit, refreshNonce, refreshKey])

  const retry = useCallback(() => {
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    listings,
    total,
    isInitialLoading,
    isPageLoading,
    error,
    retry,
  }
}

export default useMyListings
