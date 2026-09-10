import { useCallback, useEffect, useState } from 'react'
import { fetchMyListings, MY_LISTING_FILTERS } from '../services/listings.js'
import type { MyListingFilter } from '../services/listings.js'
import type { ListingWithImages } from '../types/domain'

const PAGE_SIZE = 12

export interface UseMyListingsParams {
  userId?: string
  filter?: MyListingFilter
}

export interface UseMyListingsResult {
  listings: ListingWithImages[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  hasMore: boolean
}

function useMyListings({
  userId,
  filter = MY_LISTING_FILTERS.ALL,
}: UseMyListingsParams = {}): UseMyListingsResult {
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
        const result = await fetchMyListings({
          userId,
          filter,
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
              : 'Could not load your listings. Please try again.'
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
  }, [userId, filter])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || listings.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchMyListings({
        userId,
        filter,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      setListings((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load your listings. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [userId, filter, isLoadingMore, listings.length, total, page])

  return {
    listings,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore: listings.length < total,
  }
}

export default useMyListings
