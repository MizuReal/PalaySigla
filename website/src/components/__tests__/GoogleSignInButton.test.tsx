import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GoogleSignInButton } from '../GoogleSignInButton'

describe('GoogleSignInButton', () => {
  it('renders the Google label and forwards clicks', () => {
    const onClick = vi.fn()
    render(<GoogleSignInButton onClick={onClick} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' })
    )

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire while disabled', () => {
    const onClick = vi.fn()
    render(<GoogleSignInButton onClick={onClick} disabled />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with Google' })
    )

    expect(onClick).not.toHaveBeenCalled()
  })
})
