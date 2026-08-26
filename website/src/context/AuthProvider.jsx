import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient.js'
import { signInWithEmail, signOut, signUpWithEmail } from '../services/auth.js'
import { AuthContext } from './authContext.js'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('login')

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

  const openAuthModal = useCallback((mode = 'login') => {
    setAuthModalMode(mode)
    setIsAuthModalOpen(true)
  }, [])

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isInitializing,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      signIn: (email, password) => signInWithEmail(email, password),
      signUp: (name, email, password) => signUpWithEmail(name, email, password),
      signOut: () => signOut(),
    }),
    [user, isInitializing, isAuthModalOpen, authModalMode, openAuthModal, closeAuthModal]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
