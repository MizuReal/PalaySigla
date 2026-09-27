import { useMessaging } from '../context/messagingContext'

// Global unread badge count, kept live by MessagingProvider's realtime channel.
function useUnreadMessageCount(): number {
  return useMessaging().unreadTotal
}

export default useUnreadMessageCount
