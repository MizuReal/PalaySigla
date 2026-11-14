import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Container from '../Container'

export const LEGAL_INLINE_LINK_CLASS =
  'text-link-blue underline underline-offset-2 transition-colors hover:text-primary'

interface LegalPageProps {
  title: string
  lastUpdated: string
  children: ReactNode
}

interface LegalSectionProps {
  title: string
  children: ReactNode
}

export function LegalSection({ title, children }: LegalSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="heading-sm text-ink">{title}</h2>
      {children}
    </section>
  )
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  // legal pages are public entry points: give each one its own document title
  // and restore the previous title when the reader navigates away
  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} — PalaySigla`
    return () => {
      document.title = previousTitle
    }
  }, [title])

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline bg-canvas">
        <Container className="flex h-16 items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-3" aria-label="PalaySigla home">
            <span className="h-3 w-3 bg-primary" aria-hidden="true" />
            <span className="body-strong text-ink">PalaySigla</span>
          </Link>
          <Link
            to="/"
            className="body-sm text-mute transition-colors hover:text-primary"
          >
            Back to home
          </Link>
        </Container>
      </header>

      <main>
        <Container>
          <div className="mx-auto max-w-3xl py-16 md:py-24">
            <p className="caption-md text-primary">Legal</p>
            <h1 className="display-lg mt-4 text-ink">{title}</h1>
            <p className="body-sm mt-3 text-mute">Last updated: {lastUpdated}</p>
            <div className="mt-10 space-y-8">{children}</div>
          </div>
        </Container>
      </main>

      <footer className="border-t border-hairline bg-surface-soft">
        <Container className="flex flex-col gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="utility-xs text-mute">© 2026 PalaySigla</p>
          <nav className="flex flex-wrap gap-5" aria-label="Legal">
            <Link
              to="/privacy"
              className="body-sm text-mute transition-colors hover:text-primary"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="body-sm text-mute transition-colors hover:text-primary"
            >
              Terms of Service
            </Link>
            <a
              href="mailto:PalaySigla@gmail.com"
              className="body-sm text-mute transition-colors hover:text-primary"
            >
              Contact
            </a>
          </nav>
        </Container>
      </footer>
    </div>
  )
}
