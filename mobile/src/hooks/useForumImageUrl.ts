// Resolves a forum photo's signed URL — the forum analogue of
// useListingImageUrl, exposing a truthful status so a failed lookup lands on
// the Photo fallback instead of a blank frame.
import { useEffect, useState } from 'react'
import { getForumImageUrl } from '../services/forum'

export interface UseForumImageUrlResult {
  url: string
  isLoading: boolean
  hasError: boolean
}

function useForumImageUrl(storagePath: string): UseForumImageUrlResult {
  const [state, setState] = useState<UseForumImageUrlResult>(() =>
    storagePath
      ? { url: '', isLoading: true, hasError: false }
      : { url: '', isLoading: false, hasError: false }
  )

  useEffect(() => {
    if (!storagePath) {
      return undefined
    }
    let isCurrent = true
    const loadImageUrl = async () => {
      try {
        const resolved = await getForumImageUrl(storagePath)
        if (isCurrent) {
          setState({ url: resolved, isLoading: false, hasError: false })
        }
      } catch {
        if (isCurrent) {
          setState({ url: '', isLoading: false, hasError: true })
        }
      }
    }
    loadImageUrl()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  return state
}

export default useForumImageUrl
