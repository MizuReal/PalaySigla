// Global messaging state — mirrors website/src/context/MessagingProvider.tsx.
// Owns the single inbox realtime subscription and the unread badge total; on
// React Native the reconcile-on-focus step listens to AppState 'active'
// instead of a window focus event.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { AppState } from 'react-native'
import { useAuth } from './authContext'
import { MessagingContext } from './messagingContext'
import type { MessagingContextValue } from './messagingContext'
import { fetchUnreadCounts, subscribeToInbox } from '../services/messaging'

function sumUnread(counts: Map<string, number>): number {
  let total = 0
  for (const count of counts.values()) {
    total += count
  }
  return total
}

function MessagingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [unreadTotal, setUnreadTotal] = useState(0)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refreshUnread = useCallback(async () => {
    if (!userId) {
      return
    }
    try {
      setUnreadTotal(sumUnread(await fetchUnreadCounts()))
    } catch (error) {
      // a badge is not worth surfacing an error over; log and fall back to 0
      console.error('Could not load unread message count:', error)
      setUnreadTotal(0)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      return undefined
    }
    let isCurrent = true
    const load = async () => {
      try {
        const total = sumUnread(await fetchUnreadCounts())
        if (isCurrent) {
          setUnreadTotal(total)
        }
      } catch (error) {
        console.error('Could not load unread message count:', error)
        if (isCurrent) {
          setUnreadTotal(0)
        }
      }
    }
    load()
    const unsubscribe = subscribeToInbox(userId, () => {
      setRefreshNonce((current) => current + 1)
      load()
    })
    // realtime can miss while backgrounded; reconcile when the app foregrounds
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        load()
      }
    })
    return () => {
      isCurrent = false
      unsubscribe()
      appStateSubscription.remove()
    }
  }, [userId])

  const value = useMemo<MessagingContextValue>(
    () => ({
      // a signed-out session never carries a badge, regardless of stale state
      unreadTotal: userId ? unreadTotal : 0,
      refreshNonce,
      refreshUnread: () => {
        void refreshUnread()
      },
    }),
    [userId, unreadTotal, refreshNonce, refreshUnread]
  )

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>
}

export default MessagingProvider
