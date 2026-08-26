import { useCallback, useEffect, useRef, useState } from 'react'
import Toast from '../components/Toast.jsx'
import { ToastContext, TOAST_VARIANTS } from './toastContext.js'

const TOAST_DURATION_MS = 4000
const MAX_VISIBLE_TOASTS = 4

let toastIdCounter = 0

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message, variant = TOAST_VARIANTS.INFO) => {
      const id = ++toastIdCounter
      setToasts((current) => [...current, { id, message, variant }])
      const timer = setTimeout(() => dismissToast(id), TOAST_DURATION_MS)
      timersRef.current.set(id, timer)
      return id
    },
    [dismissToast]
  )

  // unmount only: clear any pending auto-dismiss timers
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = { showToast }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed right-4 top-4 z-[70] flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6"
        >
          {toasts.slice(-MAX_VISIBLE_TOASTS).map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export default ToastProvider
