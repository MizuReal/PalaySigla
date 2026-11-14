import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthRedirectUrl } from '../authRedirect'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getAuthRedirectUrl', () => {
  it('uses the configured redirect URL', () => {
    vi.stubEnv('VITE_AUTH_REDIRECT_URL', 'https://palay-sigla.vercel.app')

    expect(getAuthRedirectUrl()).toBe('https://palay-sigla.vercel.app')
  })

  it('trims surrounding whitespace', () => {
    vi.stubEnv('VITE_AUTH_REDIRECT_URL', '  https://palay-sigla.vercel.app  ')

    expect(getAuthRedirectUrl()).toBe('https://palay-sigla.vercel.app')
  })

  it('falls back to the current origin when unset', () => {
    vi.stubEnv('VITE_AUTH_REDIRECT_URL', '')

    expect(getAuthRedirectUrl()).toBe(window.location.origin)
  })
})
