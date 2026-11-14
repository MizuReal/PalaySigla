import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../Footer'

describe('Footer', () => {
  it('links to the legal pages and contact address', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    )

    expect(
      screen.getByRole('link', { name: 'Privacy Policy' }).getAttribute('href')
    ).toBe('/privacy')
    expect(
      screen.getByRole('link', { name: 'Terms of Service' }).getAttribute('href')
    ).toBe('/terms')
    expect(
      screen.getByRole('link', { name: 'Contact' }).getAttribute('href')
    ).toBe('mailto:PalaySigla@gmail.com')
  })
})
