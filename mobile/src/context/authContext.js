import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Entry-view modes for openAuthModal. LOGIN and REGISTER mirror the website;
// RESET_PASSWORD and VERIFIED seed the dialog from email-link returns (a
// recovery deep link, or a sign-up confirmation deep link).
export const AUTH_MODAL_MODES = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
  RESET_PASSWORD: 'resetPassword',
  VERIFIED: 'verified',
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
