// Paginated listing feed state machine — ported from the website's
// useListings hook so behavior matches the web marketplace exactly. The
// feed component is remounted (keyed) on any filter change, which resets
// pagination and surfaces the fresh initial-loading state, mirroring the
// web page's keyed remount of its ListingFeed.
import { useCallback, useEffect, useState } from 'react'
import { fetchListings, LISTING_SORTS } from '../services/listings'
import type { ListingCategory, ListingSort } from '../services/listings'
import type { ListingWithImages } from '../types/domain'

const PAGE_SIZE = 12

export interface UseListingsParams {
  category?: ListingCategory | null
  search?: string
  sort?: ListingSort
}

export interface UseListingsResult {
  listings: ListingWithImages[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  reload: () => Promise<void>
  hasMore: boolean
}

function useListings({
  category = null,
  search = '',
  sort = LISTING_SORTS.NEWEST,
}: UseListingsParams = {}): UseListingsResult {
  const [listings, setListings] = useState<ListingWithImages[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    const loadFirstPage = async () => {
      try {
        const result = await fetchListings({
          category,
          search,
          sort,
          page: 1,
          limit: PAGE_SIZE,
        })
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
              : 'Could not load listings. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsInitialLoading(false)
        }
      }
    }
    loadFirstPage()
    return () => {
      isCurrent = false
    }
  }, [category, search, sort])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || listings.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchListings({
        category,
        search,
        sort,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      setListings((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
      setPage(nextPage)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load listings. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, listings.length, total, page, category, search, sort])

  // Replaces the list with a fresh page 1 — shared by pull-to-refresh and
  // anything else that re-reads the current filter without remounting.
  const reload = useCallback(async () => {
    try {
      const result = await fetchListings({
        category,
        search,
        sort,
        page: 1,
        limit: PAGE_SIZE,
      })
      setListings(result.data ?? [])
      setTotal(result.total)
      setPage(1)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load listings. Please try again.'
      )
    }
  }, [category, search, sort])

  return {
    listings,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    reload,
    hasMore: listings.length < total,
  }
}

export default useListings
