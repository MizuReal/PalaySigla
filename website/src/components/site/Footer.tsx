import Container from '../Container.jsx'

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'For mills & farmers', href: '#audience' },
      { label: 'Early access', href: '#cta' },
    ],
  },
  {
    title: 'What it detects',
    links: [
      { label: 'Quality status', href: '#features' },
      { label: 'Mold detection', href: '#features' },
      { label: 'Market grade', href: '#features' },
      { label: 'Variety classification', href: '#features' },
    ],
  },
  {
    title: 'Platforms',
    links: [
      { label: 'Mobile app', href: '#how-it-works' },
      { label: 'Web upload', href: '#how-it-works' },
      { label: 'Photo-based scanning', href: '#features' },
    ],
  },
]

function Footer() {
  return (
    <footer className="border-t border-hairline bg-surface-soft">
      <Container className="py-16 md:py-section">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:gap-6">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 bg-primary" aria-hidden="true" />
              <span className="body-strong text-ink">PalaySigla</span>
            </div>
            <p className="body-sm mt-4 text-mute">
              Real-time, image-based quality monitoring for post-harvest
              paddy — built for rice mills and farmers across the
              Philippines.
            </p>
          </div>
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="body-strong text-ink">{column.title}</h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="body-sm text-mute transition-colors hover:text-primary"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-16 border-t border-hairline pt-6">
          <p className="utility-xs text-mute">
            © 2026 PalaySigla — post-harvest paddy quality monitoring
          </p>
        </div>
      </Container>
    </footer>
  )
}

export default Footer
