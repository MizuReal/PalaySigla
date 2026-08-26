import { useEffect, useRef } from 'react'
import { useAuth } from '../context/authContext.js'
import { TOAST_VARIANTS, useToast } from '../context/toastContext.js'
import { getAuthUrlHint } from '../utils/authUrlHint.js'
import { getDisplayName } from '../utils/userProfile.js'

function AuthToasts() {
  const { user, isInitializing } = useAuth()
  const { showToast } = useToast()
  const isFirstObservedUserRef = useRef(true)
  const previousUserRef = useRef(null)
  const hasShownEmailToastRef = useRef(false)

  useEffect(() => {
    if (isInitializing) {
      return undefined
    }

    // email confirmation link return: the session was restored from the URL,
    // so this is a verification completion, not a fresh login
    if (getAuthUrlHint().type === 'signup') {
      if (!hasShownEmailToastRef.current) {
        hasShownEmailToastRef.current = true
        showToast(
          'Email verified — your account is active.',
          TOAST_VARIANTS.SUCCESS
        )
      }
      return undefined
    }

    // first observed state is the INITIAL_SESSION restore: never toast it,
    // or every page reload with a session would announce a login
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
