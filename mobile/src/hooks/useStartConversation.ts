import { useCallback, useState } from 'react'
import { getOrCreateConversation } from '../services/messaging'
import { useAuth } from '../context/authContext'
import { getDisplayName } from '../utils/userProfile'
import type { ConversationRow, ListingRow } from '../types/domain'

export interface UseStartConversationResult {
  start: (listing: ListingRow) => Promise<ConversationRow | null>
  isStarting: boolean
  error: string
}

function useStartConversation(): UseStartConversationResult {
  const { user } = useAuth()
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')

  const start = useCallback(
    async (listing: ListingRow): Promise<ConversationRow | null> => {
      if (!user) {
        setError('Please sign in to message the seller.')
        return null
      }
      setIsStarting(true)
      setError('')
      try {
        return await getOrCreateConversation({
          listingId: listing.id,
          listingTitle: listing.title,
          buyerId: user.id,
          buyerName: getDisplayName(user),
          sellerId: listing.user_id,
          sellerName: listing.seller_name,
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not open the conversation. Please try again.'
        )
        return null
      } finally {
        setIsStarting(false)
      }
    },
    [user]
  )

  return { start, isStarting, error }
}

export default useStartConversation
