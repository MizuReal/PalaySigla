import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

export const AUTH_MODAL_MODES = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
})

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
