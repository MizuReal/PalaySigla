import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../services/supabaseClient.js'
import { signInWithEmail, signOut, signUpWithEmail } from '../services/auth.js'
import { AUTH_MODAL_MODES, AuthContext } from './authContext.js'
import type { AuthContextValue, AuthModalMode } from './authContext.js'

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>(
    AUTH_MODAL_MODES.LOGIN
  )

  useEffect(() => {
    // INITIAL_SESSION restores any persisted session; every event after that
    // keeps user in sync without ad-hoc getSession calls
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsInitializing(false)
      }
    )
    return () => subscription.subscription.unsubscribe()
  }, [])

  const openAuthModal = useCallback((mode: AuthModalMode = AUTH_MODAL_MODES.LOGIN) => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signIn: (email: string, password: string) => signInWithEmail(email, password),
      signUp: (name: string, email: string, password: string) =>
        signUpWithEmail(name, email, password),
      signOut: () => signOut(),
    }),
    [user, isInitializing, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
