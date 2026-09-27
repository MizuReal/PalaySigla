import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SelectMenu from '../SelectMenu'
import type { SelectMenuOption } from '../SelectMenu'

const OPTIONS: SelectMenuOption[] = [
  { id: 'all', label: 'All categories' },
  { id: 'rice', label: 'Rice', icon: 'grain', accentText: 'text-accent-teal', count: 3 },
  { id: 'machinery', label: 'Machinery', icon: 'tractor', accentText: 'text-accent-blue' },
]

function renderMenu(value = 'all', onChange = vi.fn()) {
  render(
    <SelectMenu
      ariaLabel="Filter by category"
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />
  )
  return { onChange }
}

function trigger() {
  return screen.getByRole('button', { name: 'Filter by category' })
}

describe('SelectMenu', () => {
  it('shows the active option and only opens the listbox on demand', () => {
    renderMenu()

    expect(trigger().textContent).toContain('All categories')
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.click(trigger())
    expect(screen.getByRole('listbox')).toBeTruthy()
    expect(screen.getByRole('option', { name: /Rice/ }).textContent).toContain('3')
  })

  it('reflects the selected value on the trigger', () => {
    renderMenu('machinery')
    expect(trigger().textContent).toContain('Machinery')
  })

  it('selects an option and closes the listbox', () => {
    const { onChange } = renderMenu()

    fireEvent.click(trigger())
    fireEvent.click(screen.getByRole('option', { name: /Rice/ }))

    expect(onChange).toHaveBeenCalledWith('rice')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('closes on Escape', () => {
    renderMenu()
    fireEvent.click(trigger())

    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' })

    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('moves the active option with arrow keys and selects with Enter', () => {
    const { onChange } = renderMenu()
    fireEvent.click(trigger())
    const listbox = screen.getByRole('listbox')

    fireEvent.keyDown(listbox, { key: 'ArrowDown' })
    fireEvent.keyDown(listbox, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('rice')
  })
})
