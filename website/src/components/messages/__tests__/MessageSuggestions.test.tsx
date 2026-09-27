import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MessageSuggestions from '../MessageSuggestions'
import { INQUIRY_SUGGESTIONS } from '../../../utils/messageSuggestions'

describe('MessageSuggestions', () => {
  it('renders every opener suggestion', () => {
    render(<MessageSuggestions onSelect={vi.fn()} />)
    for (const suggestion of INQUIRY_SUGGESTIONS) {
      expect(screen.getByRole('button', { name: suggestion })).toBeTruthy()
    }
  })

  it('calls onSelect with the tapped question', () => {
    const onSelect = vi.fn()
    render(<MessageSuggestions onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Is this negotiable?' }))

    expect(onSelect).toHaveBeenCalledWith('Is this negotiable?')
  })

  it('blocks selection while disabled', () => {
    const onSelect = vi.fn()
    render(<MessageSuggestions onSelect={onSelect} disabled />)

    const first = screen.getByRole('button', {
      name: INQUIRY_SUGGESTIONS[0],
    }) as HTMLButtonElement
    expect(first.disabled).toBe(true)

    fireEvent.click(first)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
