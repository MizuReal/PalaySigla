import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import Icon from './Icon'
import type { IconName } from './Icon'

export interface SelectMenuOption {
  id: string
  label: string
  icon?: IconName
  // accent classes tint the glyph (and the swatch when provided)
  accentText?: string
  count?: number
}

interface SelectMenuProps {
  ariaLabel: string
  value: string
  options: SelectMenuOption[]
  onChange: (id: string) => void
  className?: string
}

// Accessible listbox used by the marketplace and forum category filters. The
// closed control shows the active option; opening reveals every option with
// its glyph, count, and a check on the selection. Keyboard support: arrows,
// Home/End, Enter/Space, Escape; outside click dismisses and focus returns.
function SelectMenu({
  ariaLabel,
  value,
  options,
  onChange,
  className = '',
}: SelectMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.id === value)
  )
  const [activeIndex, setActiveIndex] = useState(selectedIndex)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listboxRef = useRef<HTMLUListElement>(null)
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  const selected = options[selectedIndex]

  const open = () => {
    setActiveIndex(selectedIndex)
    setIsOpen(true)
  }

  const close = (returnFocus: boolean) => {
    setIsOpen(false)
    if (returnFocus) {
      buttonRef.current?.focus()
    }
  }

  const select = (index: number) => {
    const option = options[index]
    if (option) {
      onChange(option.id)
    }
    close(true)
  }

  // outside click dismisses the open panel
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (rootRef.current && target instanceof Node && !rootRef.current.contains(target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  // move focus into the listbox so its keydown handler receives the events
  useEffect(() => {
    if (isOpen) {
      listboxRef.current?.focus()
    }
  }, [isOpen])

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) {
        listboxRef.current?.focus()
      } else {
        open()
      }
    }
  }

  const handleListboxKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((current) => Math.min(current + 1, options.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((current) => Math.max(current - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(options.length - 1)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        select(activeIndex)
        break
      case 'Escape':
        event.preventDefault()
        close(true)
        break
      case 'Tab':
        close(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        onClick={() => (isOpen ? close(true) : open())}
        onKeyDown={handleButtonKeyDown}
        className={`inline-flex h-11 w-full items-center gap-2 rounded-sm border bg-canvas px-3 body-md text-ink transition-colors hover:border-ink ${
          isOpen ? 'border-primary' : 'border-hairline'
        }`}
      >
        {selected.icon && (
          <Icon
            name={selected.icon}
            className={`h-4 w-4 shrink-0 ${selected.accentText ?? 'text-mute'}`}
          />
        )}
        <span className="truncate">
          {selected.label}
          {selected.count !== undefined ? ` · ${selected.count}` : ''}
        </span>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          className="ml-auto h-4 w-4 shrink-0 text-ink"
        />
      </button>

      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          aria-activedescendant={optionId(activeIndex)}
          tabIndex={-1}
          onKeyDown={handleListboxKeyDown}
          className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-56 overflow-y-auto rounded-sm border border-hairline bg-canvas py-1 shadow-chrome focus:outline-none"
        >
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            const isActive = index === activeIndex
            return (
              <li
                key={option.id}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                onClick={() => select(index)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 body-md text-ink transition-colors ${
                  isActive ? 'bg-surface-soft' : ''
                }`}
              >
                {option.icon && (
                  <Icon
                    name={option.icon}
                    className={`h-4 w-4 shrink-0 ${option.accentText ?? 'text-mute'}`}
                  />
                )}
                <span className="truncate">{option.label}</span>
                <span className="ml-auto flex items-center gap-2">
                  {option.count !== undefined && (
                    <span className="caption-sm text-mute">{option.count}</span>
                  )}
                  {isSelected && (
                    <Icon name="check" className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SelectMenu
