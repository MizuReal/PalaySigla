import { useEffect, useState } from 'react'
import { fetchListingConversations } from '../services/messaging'
import type { ConversationRow } from '../types/domain'

export interface UseListingConversationsResult {
  conversations: ConversationRow[]
  isLoading: boolean
  error: string
}

// Buyer candidates for a listing's reserve/sold picker, loaded only while the
// owner opens the picker (listingId null keeps it idle).
function useListingConversations(
  listingId: string | null
): UseListingConversationsResult {
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!listingId) {
        if (isCurrent) {
          setConversations([])
          setError('')
          setIsLoading(false)
        }
        return
      }
      setIsLoading(true)
      try {
        const rows = await fetchListingConversations(listingId)
        if (isCurrent) {
          setConversations(rows)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setConversations([])
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load buyers for this listing. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [listingId])

  return { conversations, isLoading, error }
}

export default useListingConversations
