// Paginated thread comments — port of website/src/hooks/useForumComments.ts.
import { useCallback, useEffect, useState } from 'react'
import { fetchForumComments } from '../services/forum'
import { useAuth } from '../context/authContext'
import type { ForumCommentItem } from '../types/domain'

const PAGE_SIZE = 10

export interface UseForumCommentsResult {
  comments: ForumCommentItem[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
}

function useForumComments(postId: string): UseForumCommentsResult {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [comments, setComments] = useState<ForumCommentItem[]>([])
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
        const result = await fetchForumComments({
          postId,
          page: 1,
          limit: PAGE_SIZE,
          userId,
        })
        if (isCurrent) {
          setComments(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load comments. Please try again.'
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
  }, [postId, userId, refreshNonce])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || comments.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchForumComments({
        postId,
        page: nextPage,
        limit: PAGE_SIZE,
        userId,
      })
      setComments((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load comments. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [isLoadingMore, comments.length, total, page, postId, userId])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshNonce((current) => current + 1)
  }, [])

  return {
    comments,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: comments.length < total,
  }
}

export default useForumComments
