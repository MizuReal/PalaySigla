// Session provider for the mobile build. Sessions persist through AsyncStorage
// (supabaseClient.ts config); this provider is the single subscriber to
// auth events so every surface reads { user } from context — never ad-hoc
// getSession calls (AGENTS.md rule).
//
// It also owns the two root-level overlay modals, mirroring the website's
// AuthProvider + AppModals structure: the auth dialog (centered, multi-view:
// login / register / forgot / reset / verified) and the assistant chat
// (bottom sheet). Sign-in success behavior is intent-driven: entry points
// that exist to reach the chat (the chat launcher) open the modal with a
// chat intent, and a successful login then lands in the chat sheet; other
// entry points (Settings) just close the dialog. The provider additionally
// listens for email-link deep links (palaysigla://…/auth/callback), performs
// the session hand-off, and reopens the dialog in the matching mode.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import {
  completeAuthRedirect,
  signInWithEmail,
  signOut as signOutSession,
  signUpWithEmail,
} from '../services/auth'
import { supabase } from '../services/supabaseClient'
import { AUTH_MODAL_MODES, AuthContext } from './authContext'
import type {
  AuthContextValue,
  AuthModalMode,
  OpenAuthModalOptions,
} from './authContext'

const LINK_HANDLING_FAILED_MESSAGE =
  'Could not finish opening the email link. Please try again.'

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(
    AUTH_MODAL_MODES.LOGIN
  )
  const [authModalNonce, setAuthModalNonce] = useState(0)
  const [authModalError, setAuthModalError] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(false)
  const chatIntentRef = useRef(false)

  useEffect(() => {
    // INITIAL_SESSION restores any persisted session; every later event
    // (sign-in, token refresh, sign-out) keeps user in sync
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setIsInitializing(false)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const openAuthModal = useCallback(
    (mode: AuthModalMode = AUTH_MODAL_MODES.LOGIN, options: OpenAuthModalOptions = {}) => {
      chatIntentRef.current = options.chatIntent === true
      setAuthModalMode(mode)
      // bumps so an already-open dialog remounts and reseeds its view
      // (deep-link returns land while the dialog may be showing another view)
      setAuthModalNonce((current) => current + 1)
      setAuthModalError(options.authModalError ?? '')
      setIsAuthModalOpen(true)
    },
    []
  )

  const closeAuthModal = useCallback(() => {
    // an intent dies with the dialog it belonged to: dismissing without
    // signing in must never trigger the chat later
    chatIntentRef.current = false
    setIsAuthModalOpen(false)
  }, [])

  const openChat = useCallback(() => {
    setIsChatOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsChatOpen(false)
  }, [])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await signInWithEmail(email, password)
      const shouldOpenChat = chatIntentRef.current
      closeAuthModal()
      if (shouldOpenChat) {
        openChat()
      }
    },
    [closeAuthModal, openChat]
  )

  // signUpWithEmail resolves { requiresEmailConfirmation }; the dialog shows
  // the confirmation state — no overlay choreography belongs here (a session
  // is only ever created after the user returns through the email link)
  const signUp = useCallback((name: string, email: string, password: string) => {
    return signUpWithEmail(name, email, password)
  }, [])

  const signOut = useCallback(async () => {
    // close both overlays before ending the session so no gated surface
    // lingers over the signed-out intro
    closeAuthModal()
    closeChat()
    await signOutSession()
  }, [closeAuthModal, closeChat])

  const handleAuthDeepLink = useCallback(
    async (rawUrl: string) => {
      let result: Awaited<ReturnType<typeof completeAuthRedirect>> | null = null
      try {
        result = await completeAuthRedirect(rawUrl)
      } catch (error) {
        // the session hand-off failed (stale/reused link): never swallow it
        openAuthModal(AUTH_MODAL_MODES.LOGIN, {
          authModalError:
            error instanceof Error ? error.message : LINK_HANDLING_FAILED_MESSAGE,
        })
        return
      }
      if (result?.type === 'recovery') {
        openAuthModal(AUTH_MODAL_MODES.RESET_PASSWORD)
      } else if (result?.type === 'signup') {
        openAuthModal(AUTH_MODAL_MODES.VERIFIED)
      }
    },
    [openAuthModal]
  )

  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      handleAuthDeepLink(event.url)
    }
    const subscription = Linking.addEventListener('url', handleUrl)
    // cold start straight from an email link: the URL is only available once
    const openInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL()
        if (initialUrl) {
          await handleAuthDeepLink(initialUrl)
        }
      } catch {
        openAuthModal(AUTH_MODAL_MODES.LOGIN, {
          authModalError: LINK_HANDLING_FAILED_MESSAGE,
        })
      }
    }
    openInitialUrl()
    return () => subscription.remove()
  }, [handleAuthDeepLink, openAuthModal])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isAuthModalOpen,
      isChatOpen,
      authModalMode,
      authModalNonce,
      authModalError,
      openAuthModal,
      closeAuthModal,
      openChat,
      closeChat,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      isInitializing,
      isAuthModalOpen,
      isChatOpen,
      authModalMode,
      authModalNonce,
      authModalError,
      openAuthModal,
      closeAuthModal,
      openChat,
      closeChat,
      signIn,
      signUp,
      signOut,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
