import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSupabaseMock } from '../../test/supabaseMock.js'

vi.mock('../supabaseClient.js', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from '../auth.js'

beforeEach(() => {
  resetSupabaseMock(supabase)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('password bounds', () => {
  it('matches the bcrypt ceiling and the minimum policy', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(PASSWORD_MAX_LENGTH).toBe(72)
  })
})

describe('signInWithEmail', () => {
  it('passes credentials through untouched', async () => {
    await signInWithEmail('juan@example.com', 'secret123')

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'juan@example.com',
      password: 'secret123',
    })
  })

  it('maps known error codes to friendly Error instances', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'invalid_credentials' },
    })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toBeInstanceOf(Error)
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow(
      'The email or password you entered is incorrect. Please try again.'
    )

    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'email-not-confirmed' },
    })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow(
      'Your email has not been confirmed yet. Check your inbox for the confirmation link.'
    )

    supabase.auth.signInWithPassword.mockResolvedValue({ error: { code: 'NETWORK_ERROR' } })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow(
      'Could not reach the server. Check your connection and try again.'
    )
  })

  it('falls back to the provider message, then to a generic message', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: { code: 'unmapped_code', message: 'provider said no' },
    })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow('provider said no')

    supabase.auth.signInWithPassword.mockResolvedValue({ error: {} })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow(
      'Something went wrong. Please try again.'
    )
  })
})

describe('signUpWithEmail', () => {
  it('reports that email confirmation is required when no session is returned', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })

    await expect(signUpWithEmail('Juan', 'juan@example.com', 'secret123')).resolves.toEqual({
      requiresEmailConfirmation: true,
    })
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'juan@example.com',
      password: 'secret123',
      options: { data: { full_name: 'Juan' } },
    })
  })

  it('reports a session when one is returned', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    })

    await expect(signUpWithEmail('Juan', 'juan@example.com', 'secret123')).resolves.toEqual({
      requiresEmailConfirmation: false,
    })
  })

  it('maps sign-up errors through toFriendlyError', async () => {
    supabase.auth.signUp.mockResolvedValue({ error: { code: 'user_already_exists' } })

    await expect(signUpWithEmail('Juan', 'juan@example.com', 'secret123')).rejects.toThrow(
      'An account with this email already exists. Try logging in instead.'
    )
  })
})

describe('sendPasswordReset', () => {
  it('sends the configured redirect URL', async () => {
    vi.stubEnv('VITE_AUTH_REDIRECT_URL', 'https://redirect.test/auth/callback')

    await sendPasswordReset('juan@example.com')

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('juan@example.com', {
      redirectTo: 'https://redirect.test/auth/callback',
    })
  })

  it('maps errors through toFriendlyError', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit' },
    })

    await expect(sendPasswordReset('juan@example.com')).rejects.toThrow(
      'Too many emails sent. Please wait a moment and try again.'
    )
  })
})

describe('signOut', () => {
  it('resolves when the provider succeeds', async () => {
    await expect(signOut()).resolves.toBeUndefined()
    expect(supabase.auth.signOut).toHaveBeenCalledTimes(1)
  })

  it('maps errors through toFriendlyError', async () => {
    supabase.auth.signOut.mockResolvedValue({ error: { code: 'network_error' } })

    await expect(signOut()).rejects.toThrow(
      'Could not reach the server. Check your connection and try again.'
    )
  })
})
