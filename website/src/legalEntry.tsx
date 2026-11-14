import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

// Build-time entry used only by scripts/prerenderLegal.mjs. Google's OAuth
// reviewer must be able to read the policy from the raw HTML, so these pages
// are rendered to static files instead of relying on client-side routing.
export function renderPrivacyPage(): string {
  return renderToString(
    <MemoryRouter>
      <PrivacyPage />
    </MemoryRouter>
  )
}

export function renderTermsPage(): string {
  return renderToString(
    <MemoryRouter>
      <TermsPage />
    </MemoryRouter>
  )
}
