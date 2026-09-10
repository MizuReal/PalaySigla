import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import Icon from './Icon.jsx'

interface ModalProps {
  onClose: () => void
  labelledBy: string
  panelClassName?: string
  children: ReactNode
}

// mounted only while the dialog should be visible; unmounting restores focus
function Modal({ onClose, labelledBy, panelClassName = 'max-w-md', children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // reason: activeElement is an HTMLElement in this app; Element has no focus()
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
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
        className={`relative w-full ${panelClassName} border border-hairline bg-canvas p-6 sm:p-8 focus:outline-none`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center text-mute transition-colors hover:text-ink"
        >
          <Icon name="close" className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

export default Modal
