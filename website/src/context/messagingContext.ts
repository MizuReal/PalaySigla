import { createContext, useContext } from 'react'

export interface MessagingContextValue {
  unreadTotal: number
  // bumps whenever realtime reports an inbox change; hooks key their re-reads
  // on it so a background update refreshes the visible list in place
  refreshNonce: number
  refreshUnread: () => void
}

export const MessagingContext = createContext<MessagingContextValue | null>(null)

export function useMessaging(): MessagingContextValue {
  const context = useContext(MessagingContext)
  if (context === null) {
    throw new Error('useMessaging must be used within a MessagingProvider')
  }
  return context
}
