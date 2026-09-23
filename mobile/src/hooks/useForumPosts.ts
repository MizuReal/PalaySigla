// Paginated community feed — port of website/src/hooks/useForumPosts.ts. The
// viewer id enriches each post with its heart state; refresh keeps the current
// list on screen until the fresh page arrives (no skeleton flash).
import { useCallback, useEffect, useState } from 'react'
import { fetchForumPosts } from '../services/forum'
import type { ForumCategory } from '../services/forum'
import { useAuth } from '../context/authContext'
import type { ForumPostSummary } from '../types/domain'

const PAGE_SIZE = 10

export interface UseForumPostsParams {
  category?: ForumCategory | null
  search?: string
}

export interface UseForumPostsResult {
  posts: ForumPostSummary[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
}

function useForumPosts({
  category = null,
  search = '',
}: UseForumPostsParams = {}): UseForumPostsResult {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [posts, setPosts] = useState<ForumPostSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const loadFirstPage = async () => {
      try {
        const result = await fetchForumPosts({
          category,
          search,
          page: 1,
          limit: PAGE_SIZE,
          userId,
        })
        if (isCurrent) {
          setPosts(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load discussions. Please try again.'
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
  }, [category, search, userId, refreshNonce])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || posts.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchForumPosts({
        category,
        search,
        page: nextPage,
        limit: PAGE_SIZE,
        userId,
      })
      setPosts((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not load discussions. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [isLoadingMore, posts.length, total, page, category, search, userId])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    posts,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: posts.length < total,
  }
}

export default useForumPosts
