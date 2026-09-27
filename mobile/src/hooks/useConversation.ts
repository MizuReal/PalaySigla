import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getConversation,
  getConversationRole,
  markConversationRead,
  sendMessage,
  subscribeToConversation,
  fetchMessages,
} from '../services/messaging'
import { useAuth } from '../context/authContext'
import { useMessaging } from '../context/messagingContext'
import type { ConversationRow, MessageRow } from '../types/domain'

const PAGE_SIZE = 20

// pending rows are optimistic viewer turns awaiting the server echo
export type ThreadMessage = MessageRow & { pending?: boolean }

export interface UseConversationResult {
  conversation: ConversationRow | null
  messages: ThreadMessage[]
  total: number
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  loadMore: () => Promise<void>
  refresh: () => void
  hasMore: boolean
  isSending: boolean
  sendError: string
  send: (body: string) => Promise<void>
}

interface UseConversationParams {
  conversationId: string
}

function useConversation({ conversationId }: UseConversationParams): UseConversationResult {
  const { user } = useAuth()
  const { refreshUnread } = useMessaging()
  const userId = user?.id ?? null
  const [conversation, setConversation] = useState<ConversationRow | null>(null)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const lastMarkedIdRef = useRef<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!userId) {
        if (isCurrent) {
          setConversation(null)
          setMessages([])
          setTotal(0)
          setError('')
          setIsInitialLoading(false)
        }
        return
      }
      try {
        const [conversationRow, messagesPage] = await Promise.all([
          getConversation(conversationId),
          fetchMessages({ conversationId, page: 1, limit: PAGE_SIZE }),
        ])
        if (isCurrent) {
          setConversation(conversationRow)
          setMessages(messagesPage.data ?? [])
          setTotal(messagesPage.total)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load the conversation. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsInitialLoading(false)
          setIsLoadingMore(false)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [conversationId, userId, refreshNonce])

  useEffect(() => {
    lastMarkedIdRef.current = null
    const unsubscribe = subscribeToConversation(conversationId, (incoming) => {
      setMessages((current) =>
        current.some((message) => message.id === incoming.id) ? current : [...current, incoming]
      )
    })
    return unsubscribe
  }, [conversationId])

  // read watermark: once an incoming turn is the newest visible message, clear
  // the unread state for this thread (guarded so the effect cannot loop)
  useEffect(() => {
    if (!conversation || !userId) {
      return
    }
    const last = messages[messages.length - 1]
    if (!last || last.pending || last.sender_id === userId) {
      return
    }
    if (lastMarkedIdRef.current === last.id) {
      return
    }
    lastMarkedIdRef.current = last.id
    const role = getConversationRole(conversation, userId)
    markConversationRead(conversation.id, role)
      .then(() => refreshUnread())
      .catch((err) => {
        console.error('Could not mark the conversation read:', err)
      })
  }, [conversation, messages, userId, refreshUnread])

  const loadMore = useCallback(async () => {
    if (!userId || isLoadingMore || messages.length >= total) {
      return
    }
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const result = await fetchMessages({
        conversationId,
        page: nextPage,
        limit: PAGE_SIZE,
      })
      // older pages prepend so the transcript stays chronological
      setMessages((current) => [...(result.data ?? []), ...current])
      setTotal(result.total)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not load the conversation. Please try again.'
      )
    } finally {
      setIsLoadingMore(false)
      setPage(nextPage)
    }
  }, [userId, isLoadingMore, messages.length, total, page, conversationId])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshNonce((current) => current + 1)
  }, [])

  const send = useCallback(
    async (body: string) => {
      if (!conversation || !userId) {
        return
      }
      const trimmed = body.trim()
      if (!trimmed) {
        return
      }
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const optimistic: ThreadMessage = {
        id: tempId,
        conversation_id: conversation.id,
        sender_id: userId,
        body: trimmed,
        created_at: new Date().toISOString(),
        pending: true,
      }
      setMessages((current) => [...current, optimistic])
      setIsSending(true)
      setSendError('')
      try {
        const saved = await sendMessage({
          conversationId: conversation.id,
          senderId: userId,
          body: trimmed,
        })
        setMessages((current) => {
          const withoutTemp = current.filter((message) => message.id !== tempId)
          return withoutTemp.some((message) => message.id === saved.id)
            ? withoutTemp
            : [...withoutTemp, saved]
        })
      } catch (err) {
        setMessages((current) => current.filter((message) => message.id !== tempId))
        setSendError(
          err instanceof Error ? err.message : 'Could not send the message. Please try again.'
        )
      } finally {
        setIsSending(false)
      }
    },
    [conversation, userId]
  )

  return {
    conversation,
    messages,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore: messages.length < total,
    isSending,
    sendError,
    send,
  }
}

export default useConversation
