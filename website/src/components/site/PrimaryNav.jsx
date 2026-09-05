import { useEffect, useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Button from '../Button.jsx'
import Container from '../Container.jsx'
import Icon from '../Icon.jsx'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext.js'
import { getDisplayName } from '../../utils/userProfile.js'

const PAGE_LINKS = [
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'Rice Husk Analysis', to: '/rice-husk-analysis' },
  { label: 'Profile', to: '/profile' },
]

const MORE_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'For you', href: '#audience' },
  { label: 'Early access', href: '#cta' },
]

const linkClasses = 'body-strong text-ink transition-colors hover:text-primary'
const activeLinkClasses = 'body-strong text-primary'
const drawerItemClasses =
  'heading-md border-b border-hairline py-5 transition-colors hover:text-primary'

function RouteLink({ link, onNavigate, getClassName }) {
  return (
    <NavLink
      to={link.to}
      end
      onClick={onNavigate}
      className={({ isActive }) => getClassName(isActive)}
    >
      {link.label}
    </NavLink>
  )
}

function MoreMenu({ links }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)

  // listeners only matter while the panel is open: outside click and Escape dismiss it
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const handlePointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="More links"
        className="flex items-center gap-1.5"
      >
        <span className={isOpen ? activeLinkClasses : linkClasses}>More</span>
        <Icon
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          className={`h-4 w-4 ${isOpen ? 'text-primary' : 'text-ink'}`}
        />
      </button>
      {isOpen && (
        <ul
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-48 border border-hairline bg-canvas shadow-chrome"
        >
          {links.map((link) => (
            <li key={link.href} role="none">
              <a
                role="menuitem"
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="block whitespace-nowrap px-5 py-3 text-ink transition-colors hover:bg-surface-soft hover:text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function BrandMark() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="PalaySigla home">
      <span className="h-3 w-3 bg-primary" aria-hidden="true" />
      <span className="body-strong text-ink">PalaySigla</span>
    </Link>
  )
}

function PrimaryNav() {
  const { user, isInitializing, openAuthModal, signOut } = useAuth()
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [signOutError, setSignOutError] = useState('')

  // mount-only scroll listener: keeps the chrome shadow tied to page scroll state
  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 0)
    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollState)
  }, [])

  const closeDrawer = () => setIsDrawerOpen(false)

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      await signOut()
    } catch (error) {
      setSignOutError(error.message)
    }
  }

  const openLogin = () => {
    setIsDrawerOpen(false)
    openAuthModal(AUTH_MODAL_MODES.LOGIN)
  }

  const openRegister = () => {
    setIsDrawerOpen(false)
    openAuthModal(AUTH_MODAL_MODES.REGISTER)
  }

  const renderAuthArea = () => {
    if (isInitializing) {
      return null
    }
    if (user) {
      return (
        <div className="flex items-center gap-6">
          <span className="body-strong max-w-40 truncate text-ink">
            {getDisplayName(user)}
          </span>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
          {signOutError && (
            <p className="caption-sm text-error" role="alert">
              {signOutError}
            </p>
          )}
        </div>
      )
    }
    return (
      <>
        <button
          type="button"
          onClick={openLogin}
          className="body-strong text-ink transition-colors hover:text-primary"
        >
          Login
        </button>
        <Button onClick={openRegister}>Get started</Button>
      </>
    )
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b border-hairline bg-canvas transition-shadow duration-150 ${
        isScrolled ? 'shadow-chrome' : ''
      }`}
    >
      <Container className="flex h-16 items-center justify-between gap-6">
        <BrandMark />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary">
          {PAGE_LINKS.map((link) => (
            <RouteLink
              key={link.to}
              link={link}
              getClassName={(isActive) =>
                isActive ? activeLinkClasses : linkClasses
              }
            />
          ))}
          <MoreMenu links={MORE_LINKS} />
        </nav>

        <div className="hidden items-center gap-6 lg:flex">
          {renderAuthArea()}
        </div>

        <button
          type="button"
          className="text-ink lg:hidden"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Icon name="menu" className="h-7 w-7" />
        </button>
      </Container>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-canvas lg:hidden">
          <Container className="flex h-16 items-center justify-between border-b border-hairline">
            <BrandMark />
            <button
              type="button"
              className="text-ink"
              onClick={closeDrawer}
              aria-label="Close menu"
            >
              <Icon name="close" className="h-7 w-7" />
            </button>
          </Container>
          <nav
            className="flex flex-1 flex-col gap-2 px-6 py-8"
            aria-label="Mobile"
          >
            {PAGE_LINKS.map((link) => (
              <RouteLink
                key={link.to}
                link={link}
                onNavigate={closeDrawer}
                getClassName={(isActive) =>
                  `${drawerItemClasses} ${isActive ? 'text-primary' : 'text-ink'}`
                }
              />
            ))}
            <span className="mt-8 border-t border-hairline" aria-hidden="true" />
            {MORE_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeDrawer}
                className={`${drawerItemClasses} text-ink`}
              >
                {link.label}
              </a>
            ))}
          </nav>
          <Container className="pb-10">
            {user ? (
              <>
                <p className="body-strong mb-4 text-ink">
                  {getDisplayName(user)}
                </p>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full justify-center"
                >
                  Sign out
                </Button>
                {signOutError && (
                  <p className="caption-sm mt-3 text-error" role="alert">
                    {signOutError}
                  </p>
                )}
              </>
            ) : (
              <>
                <Button onClick={openRegister} className="w-full justify-center">
                  Get started
                </Button>
                <button
                  type="button"
                  onClick={openLogin}
                  className="body-strong mt-4 block w-full text-center text-ink transition-colors hover:text-primary"
                >
                  Login
                </button>
              </>
            )}
          </Container>
        </div>
      )}
    </header>
  )
}

export default PrimaryNav
