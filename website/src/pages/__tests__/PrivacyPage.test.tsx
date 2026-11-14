import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from '../PrivacyPage'

function renderPrivacyPage() {
  render(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>
  )
}

describe('PrivacyPage', () => {
  it('discloses the limited Gmail API use', () => {
    renderPrivacyPage()

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Privacy Policy'
    )
    expect(document.body.textContent).toContain('gmail.send')
    expect(document.body.textContent).toContain(
      'Google API Services User Data Policy'
    )
    expect(document.body.textContent).toContain('Limited Use requirements')
    expect(document.title).toBe('Privacy Policy — PalaySigla')
  })

  it('gives readers a contact address and the other legal page', () => {
    renderPrivacyPage()

    const contactLinks = screen.getAllByRole('link', {
      name: 'PalaySigla@gmail.com',
    })
    expect(contactLinks.length).toBeGreaterThan(0)
    expect(contactLinks[0].getAttribute('href')).toBe(
      'mailto:PalaySigla@gmail.com'
    )
    expect(
      screen.getByRole('link', { name: 'Terms of Service' }).getAttribute('href')
    ).toBe('/terms')
    expect(
      screen.getByRole('link', { name: 'Back to home' }).getAttribute('href')
    ).toBe('/')
  })
})
