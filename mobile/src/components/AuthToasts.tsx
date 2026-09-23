// Auth-event toasts: a successful sign-in and a sign-out are announced from
// the root toast layer. The first observed user is the cold-start session
// restore and is never toasted; email-verification feedback stays in the auth
// dialog's "Email verified" panel (the mobile deep-link flow), so it is not
// duplicated here.
import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import { getDisplayName } from '../utils/userProfile'

function AuthToasts() {
  const { user, isInitializing } = useAuth()
  const { showToast } = useToast()
  const isFirstObservedUserRef = useRef(true)
  const previousUserRef = useRef<User | null>(null)

  useEffect(() => {
    if (isInitializing) {
      return undefined
    }

    // the first observed state is the INITIAL_SESSION restore: never toast it,
    // or every cold start with a session would announce a login
    if (isFirstObservedUserRef.current) {
      isFirstObservedUserRef.current = false
      previousUserRef.current = user
      return undefined
    }

    const previousUser = previousUserRef.current
    if (previousUser === null && user !== null) {
      showToast(
        `Logged in. Welcome back, ${getDisplayName(user)}!`,
        TOAST_VARIANTS.SUCCESS
      )
    } else if (previousUser !== null && user === null) {
      showToast("You're signed out.", TOAST_VARIANTS.INFO)
    }
    previousUserRef.current = user
    return undefined
  }, [user, isInitializing, showToast])

  return null
}

export default AuthToasts
