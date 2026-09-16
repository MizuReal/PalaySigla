import { useCallback, useEffect, useState } from 'react'
import { getForumPost } from '../services/forum'
import { useAuth } from '../context/authContext'
import type { ForumPostSummary } from '../types/domain'

export interface UseForumPostResult {
  post: ForumPostSummary | null
  isLoading: boolean
  error: string
  refresh: () => void
}

function useForumPost(postId: string): UseForumPostResult {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [post, setPost] = useState<ForumPostSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      try {
        const result = await getForumPost(postId, userId)
        if (isCurrent) {
          setPost(result)
          setError('')
        }
      } catch (err) {
        if (isCurrent) {
          setError(
            err instanceof Error ? err.message : 'That discussion could not be found.'
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
  }, [postId, userId, refreshNonce])

  const refresh = useCallback(() => {
    setRefreshNonce((current) => current + 1)
  }, [])

  return { post, isLoading, error, refresh }
}

export default useForumPost
