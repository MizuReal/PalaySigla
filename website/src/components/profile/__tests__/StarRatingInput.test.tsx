import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StarRatingInput from '../StarRatingInput'

function starRadio(label: string): HTMLElement {
  return screen.getByRole('radio', { name: label })
}

describe('StarRatingInput', () => {
  it('calls onChange with the tapped rating', () => {
    const onChange = vi.fn()
    render(<StarRatingInput value={0} onChange={onChange} />)

    fireEvent.click(starRadio('4 stars'))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('marks the selected star', () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} />)

    expect(starRadio('3 stars').getAttribute('aria-checked')).toBe('true')
    expect(starRadio('5 stars').getAttribute('aria-checked')).toBe('false')
  })

  it('fills selected stars and leaves the rest outlined', () => {
    render(<StarRatingInput value={3} onChange={vi.fn()} />)

    expect(starRadio('3 stars').querySelector('svg')?.getAttribute('fill')).toBe(
      'currentColor'
    )
    expect(starRadio('5 stars').querySelector('svg')?.getAttribute('fill')).toBe('none')
  })

  it('shows a ratio readout that tracks the value', () => {
    const { rerender } = render(<StarRatingInput value={0} onChange={vi.fn()} />)
    expect(screen.getByText('0 / 5')).toBeTruthy()

    rerender(<StarRatingInput value={4} onChange={vi.fn()} />)
    expect(screen.getByText('4 / 5')).toBeTruthy()
  })

  it('blocks changes while disabled', () => {
    const onChange = vi.fn()
    render(<StarRatingInput value={0} onChange={onChange} disabled />)

    const star = starRadio('1 star') as HTMLButtonElement
    expect(star.disabled).toBe(true)
    fireEvent.click(star)
    expect(onChange).not.toHaveBeenCalled()
  })
})
