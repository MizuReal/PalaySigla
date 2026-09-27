import { useCallback, useEffect, useState } from 'react'
import { fetchConversations } from '../services/messaging'
import { useAuth } from '../context/authContext'
import { useMessaging } from '../context/messagingContext'
import type { ConversationSummary } from '../types/domain'

const PAGE_SIZE = 20

export interface UseConversationsResult {
  conversations: ConversationSummary[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
}

function useConversations(): UseConversationsResult {
  const { user } = useAuth()
  const { refreshNonce } = useMessaging()
  const userId = user?.id ?? null
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [localNonce, setLocalNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const loadFirstPage = async () => {
      if (!userId) {
        if (isCurrent) {
          setConversations([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
        return
      }
      try {
        const result = await fetchConversations(userId, { page: 1, limit: PAGE_SIZE })
        if (isCurrent) {
          setConversations(result.data ?? [])
          setTotal(result.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'Could not load your messages. Please try again.'
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
  }, [userId, refreshNonce, localNonce])

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || conversations.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchConversations(userId, { page: nextPage, limit: PAGE_SIZE })
      setConversations((current) => [...current, ...(result.data ?? [])])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your messages. Please try again.')
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [userId, isLoadingMore, conversations.length, total, page])

  const refresh = useCallback(() => {
    setPage(1)
    setLocalNonce((current) => current + 1)
  }, [])

  return {
    conversations,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: conversations.length < total,
  }
}

export default useConversations
