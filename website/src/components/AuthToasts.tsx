import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import {
  clearAuthUrlHash,
  getAuthErrorMessage,
  getAuthUrlHint,
} from '../utils/authUrlHint'
import { triggerProfileNudge } from '../utils/profileNudge'
import { getDisplayName } from '../utils/userProfile'

function AuthToasts() {
  const { user, isInitializing, openAuthModal } = useAuth()
  const { showToast } = useToast()
  const isFirstObservedUserRef = useRef(true)
  const previousUserRef = useRef<User | null>(null)
  const hasShownEmailToastRef = useRef(false)
  const hasShownAuthErrorRef = useRef(false)
  const hasOpenedRecoveryRef = useRef(false)

  // failed email-link return: show the actionable reason immediately and
  // remove the raw error fragment from the address bar. This is independent
  // of auth initialization because no session is created on an error link.
  useEffect(() => {
    if (hasShownAuthErrorRef.current) {
      return undefined
    }
    const message = getAuthErrorMessage(getAuthUrlHint())
    if (!message) {
      return undefined
    }
    hasShownAuthErrorRef.current = true
    showToast(message, TOAST_VARIANTS.ERROR)
    clearAuthUrlHash()
  }, [showToast])

  // recovery link return: the link already created a session, but the user
  // must choose a new password before the session is useful
  useEffect(() => {
    if (isInitializing || hasOpenedRecoveryRef.current) {
      return undefined
    }
    const hint = getAuthUrlHint()
    if (hint.type !== 'recovery' || hint.error || hint.errorCode) {
      return undefined
    }
    hasOpenedRecoveryRef.current = true
    openAuthModal(AUTH_MODAL_MODES.RESET_PASSWORD)
    clearAuthUrlHash()
  }, [isInitializing, openAuthModal])

  useEffect(() => {
    if (isInitializing) {
      return undefined
    }

    const authHint = getAuthUrlHint()

    // email confirmation link return: the session was restored from the URL,
    // so this is a verification completion, not a fresh login
    if (authHint.type === 'signup') {
      if (!hasShownEmailToastRef.current) {
        hasShownEmailToastRef.current = true
        showToast(
          'Email verified — your account is active.',
          TOAST_VARIANTS.SUCCESS
        )
        triggerProfileNudge()
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
