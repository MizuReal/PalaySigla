import { useCallback, useEffect, useState } from 'react'
import { fetchForumCategoryCounts } from '../services/forum'
import type { ForumCategoryCounts } from '../services/forum'

export interface UseForumCategoryCountsResult {
  counts: ForumCategoryCounts | null
  isLoading: boolean
  error: string
  retry: () => void
}

function useForumCategoryCounts(refreshNonce = 0): UseForumCategoryCountsResult {
  const [counts, setCounts] = useState<ForumCategoryCounts | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const loadCounts = async () => {
      try {
        const result = await fetchForumCategoryCounts()
        if (isCurrent) {
          setCounts(result)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load categories. Please try again.'
          )
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }
    loadCounts()
    return () => {
      isCurrent = false
    }
  }, [refreshNonce, retryNonce])

  const retry = useCallback(() => {
    setIsLoading(true)
    setError('')
    setRetryNonce((current) => current + 1)
  }, [])

  return { counts, isLoading, error, retry }
}

export default useForumCategoryCounts
