import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

// Entry-view modes for openAuthModal. LOGIN and REGISTER mirror the website;
// RESET_PASSWORD and VERIFIED seed the dialog from email-link returns (a
// recovery deep link, or a sign-up confirmation deep link).
export const AUTH_MODAL_MODES = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
  RESET_PASSWORD: 'resetPassword',
  VERIFIED: 'verified',
} as const)

export type AuthModalMode = (typeof AUTH_MODAL_MODES)[keyof typeof AUTH_MODAL_MODES]

export interface OpenAuthModalOptions {
  chatIntent?: boolean
  authModalError?: string
}

export interface AuthContextValue {
  user: User | null
  isInitializing: boolean
  isAuthModalOpen: boolean
  isChatOpen: boolean
  authModalMode: AuthModalMode
  authModalNonce: number
  authModalError: string
  openAuthModal: (mode?: AuthModalMode, options?: OpenAuthModalOptions) => void
  closeAuthModal: () => void
  openChat: () => void
  closeChat: () => void
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
