import { createContext, useContext } from 'react'

export const TOAST_VARIANTS = Object.freeze({
  SUCCESS: 'success',
  INFO: 'info',
  ERROR: 'error',
} as const)

export type ToastVariant = (typeof TOAST_VARIANTS)[keyof typeof TOAST_VARIANTS]

export interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

export interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => number
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
