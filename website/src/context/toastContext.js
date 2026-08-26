import { createContext, useContext } from 'react'

export const ToastContext = createContext(null)

export const TOAST_VARIANTS = Object.freeze({
  SUCCESS: 'success',
  INFO: 'info',
  ERROR: 'error',
})

export function useToast() {
  const context = useContext(ToastContext)
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
