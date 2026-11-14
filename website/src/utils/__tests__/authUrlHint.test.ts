import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAuthUrlHash,
  getAuthErrorMessage,
  parseAuthUrlHash,
} from '../authUrlHint'

const EXPIRED_HASH =
  '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb='

describe('parseAuthUrlHash', () => {
  it('reads failed email-link parameters', () => {
    expect(parseAuthUrlHash(EXPIRED_HASH)).toEqual({
      type: null,
      error: 'access_denied',
      errorCode: 'otp_expired',
      errorDescription: 'Email link is invalid or has expired',
    })
  })

  it('reads a successful signup return', () => {
    expect(
      parseAuthUrlHash(
        '#access_token=tok&refresh_token=ref&expires_in=3600&type=signup'
      )
    ).toEqual({
      type: 'signup',
      error: null,
      errorCode: null,
      errorDescription: null,
    })
  })

  it('returns nulls when there is no auth fragment', () => {
    expect(parseAuthUrlHash('')).toEqual({
      type: null,
      error: null,
      errorCode: null,
      errorDescription: null,
    })
  })
})

describe('getAuthErrorMessage', () => {
  it('explains an expired or reused link', () => {
    expect(getAuthErrorMessage(parseAuthUrlHash(EXPIRED_HASH))).toBe(
      'This email link has expired or was already used. Please request a new link.'
    )
  })

  it('explains access denied without an error code', () => {
    expect(
      getAuthErrorMessage(parseAuthUrlHash('#error=access_denied'))
    ).toBe(
      'Sign-in was cancelled or the link is invalid. Please try again or request a new link.'
    )
  })

  it('falls back for unknown error codes', () => {
    expect(
      getAuthErrorMessage(parseAuthUrlHash('#error_code=something_new'))
    ).toBe('We could not complete sign-in. Please try again.')
  })

  it('returns null when there is no error', () => {
    expect(getAuthErrorMessage(parseAuthUrlHash('#type=signup'))).toBeNull()
  })
})

describe('clearAuthUrlHash', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', `/?from=email${EXPIRED_HASH}`)
  })

  it('removes the fragment while keeping the query string', () => {
    clearAuthUrlHash()

    expect(window.location.search).toBe('?from=email')
    expect(window.location.hash).toBe('')
  })
})
