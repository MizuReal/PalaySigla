import { useCallback, useEffect, useState } from 'react'
import { fetchListings, LISTING_SORTS } from '../services/listings.js'

const PAGE_SIZE = 12

function useListings({ category = null, search = '', sort = LISTING_SORTS.NEWEST } = {}) {
  const [listings, setListings] = useState([])
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
          setListings(result.data)
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message)
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
      setListings((current) => [...current, ...result.data])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [isLoadingMore, listings.length, total, page, category, search, sort])

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

export default useListings
