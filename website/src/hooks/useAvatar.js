import { useEffect, useState } from 'react'
import { useAuth } from '../context/authContext.js'
import { getOwnAvatarUrl } from '../services/profile.js'

const NO_AVATAR = Object.freeze({ userId: null, url: '' })

// navbar account chip avatar: a per-user signed URL that degrades to the
// initials fallback whenever the lookup fails (decoration, never blocking).
// The url is only rendered while it belongs to the current user, so an old
// account's photo can never flash during a session switch.
function useAvatar() {
  const { user } = useAuth()
  const [avatar, setAvatar] = useState(NO_AVATAR)
  const userId = user?.id ?? null

  useEffect(() => {
    if (!userId) {
      return
    }
    let isCancelled = false
    getOwnAvatarUrl(userId)
      .then((url) => {
        if (!isCancelled) {
          setAvatar({ userId, url })
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          // the initials circle stays up as the friendly fallback
          setAvatar({ userId, url: '' })
          console.error('Could not load the navbar avatar:', error)
        }
      })
    return () => {
      isCancelled = true
    }
  }, [userId])

  return { avatarUrl: avatar.userId === userId ? avatar.url : '' }
}

export default useAvatar
