import { useEffect, useRef } from 'react'
import Icon from './Icon.jsx'

// mounted only while the dialog should be visible; unmounting restores focus
function Modal({ onClose, labelledBy, children }) {
  const panelRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement
    panelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocusedRef.current?.focus()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-surface-elevated/70"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative w-full max-w-md border border-hairline bg-canvas p-6 sm:p-8 focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-mute transition-colors hover:text-ink"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
