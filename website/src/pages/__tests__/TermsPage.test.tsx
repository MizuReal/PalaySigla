import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TermsPage from '../TermsPage'

function renderTermsPage() {
  render(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>
  )
}

describe('TermsPage', () => {
  it('sets the page title and explains the service limits', () => {
    renderTermsPage()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Terms of Service'
    )
    expect(document.body.textContent).toContain(
      'advisory and may be inaccurate or incomplete'
    )
    expect(document.body.textContent).toContain('Republic of the Philippines')
    expect(document.title).toBe('Terms of Service — PalaySigla')
  })

  it('links to the privacy policy and contact address', () => {
    renderTermsPage()

    const privacyLinks = screen.getAllByRole('link', { name: 'Privacy Policy' })
    expect(privacyLinks.length).toBeGreaterThan(0)
    expect(privacyLinks[0].getAttribute('href')).toBe('/privacy')
    expect(
      screen.getByRole('link', { name: 'PalaySigla@gmail.com' }).getAttribute('href')
    ).toBe('mailto:PalaySigla@gmail.com')
  })
})
