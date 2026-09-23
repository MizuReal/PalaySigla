// Root toast layer — the web ToastProvider ported to a React Native viewport.
// A toast auto-dismisses after 4s (or on its close affordance) and the viewport
// keeps the newest four. It renders at the app root, above screens but below the
// auth/chat Modal overlays (documented deviation): every call site fires as an
// overlay closes, so notifications are visible. State is updated only from
// events/timers, never synchronously from an effect.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from '../components/Toast'
import { TOAST_VARIANTS, ToastContext } from './toastContext'
import type { ToastContextValue, ToastItem, ToastVariant } from './toastContext'
import { GUTTER, SPACING } from '../theme/designTokens'

const TOAST_DURATION_MS = 4000
const MAX_VISIBLE_TOASTS = 4

let toastIdCounter = 0

function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = TOAST_VARIANTS.INFO) => {
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

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          accessibilityLiveRegion="polite"
          style={[styles.viewport, { paddingTop: insets.top + SPACING.lg }]}
        >
          {toasts.slice(-MAX_VISIBLE_TOASTS).map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    gap: SPACING.md,
    paddingHorizontal: GUTTER,
    zIndex: 100,
  },
})

export default ToastProvider
