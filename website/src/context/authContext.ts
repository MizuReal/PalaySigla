import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export const AUTH_MODAL_MODES = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
} as const)

export type AuthModalMode = (typeof AUTH_MODAL_MODES)[keyof typeof AUTH_MODAL_MODES]

export interface AuthContextValue {
  user: User | null
  isInitializing: boolean
  isAuthModalOpen: boolean
  authModalMode: AuthModalMode
  openAuthModal: (mode?: AuthModalMode) => void
  closeAuthModal: () => void
  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ requiresEmailConfirmation: boolean }>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
