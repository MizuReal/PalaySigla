import AsyncStorage from '@react-native-async-storage/async-storage'
import { resetSupabaseMock } from '../../test/supabaseMock.js'

jest.mock('../supabaseClient.js', () => {
  const { createSupabaseMock } = jest.requireActual('../../test/supabaseMock.js')
  return { supabase: createSupabaseMock() }
})

import { supabase } from '../supabaseClient.js'
import {
  completeAuthRedirect,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  sendPasswordReset,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePassword,
} from '../auth.js'

const PENDING_AUTH_RETURN_KEY = 'palaysigla:pendingAuthReturn'
const REDIRECT_URL = 'https://palaysigla.test/auth/callback'

beforeEach(async () => {
  resetSupabaseMock(supabase)
  await AsyncStorage.clear()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('password bounds', () => {
  it('matches the bcrypt ceiling and the minimum policy', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(PASSWORD_MAX_LENGTH).toBe(72)
  })
})

describe('signInWithEmail', () => {
  it('normalizes the email before calling the provider', async () => {
    await signInWithEmail('  Juan@Example.COM ', 'secret123')

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

    supabase.auth.signInWithPassword.mockResolvedValue({ error: { code: 'otp_expired' } })
    await expect(signInWithEmail('a@b.c', 'x')).rejects.toThrow(
      'This link has expired. Please request a new one.'
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
  it('settles the normalized payload and records a pending signup return', async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })

    await expect(signUpWithEmail('  Juan  ', '  Juan@Example.COM ', 'secret123')).resolves.toEqual(
      { requiresEmailConfirmation: true }
    )

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'juan@example.com',
      password: 'secret123',
      options: {
        data: { full_name: 'Juan' },
        emailRedirectTo: REDIRECT_URL,
      },
    })
    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBe('signup')
  })

  it('does not record a pending return when a session comes back', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { session: { access_token: 'token' } },
      error: null,
    })

    await expect(signUpWithEmail('Juan', 'juan@example.com', 'secret123')).resolves.toEqual({
      requiresEmailConfirmation: false,
    })
    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBeNull()
  })

  it('maps sign-up errors through toFriendlyError', async () => {
    supabase.auth.signUp.mockResolvedValue({ error: { code: 'user_already_exists' } })

    await expect(signUpWithEmail('Juan', 'juan@example.com', 'secret123')).rejects.toThrow(
      'An account with this email already exists. Try logging in instead.'
    )
  })
})

describe('sendPasswordReset', () => {
  it('normalizes the email, sends the redirect URL, and records a pending recovery', async () => {
    await sendPasswordReset('  Juan@Example.COM ')

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('juan@example.com', {
      redirectTo: REDIRECT_URL,
    })
    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBe('recovery')
  })

  it('maps errors through toFriendlyError without recording a pending return', async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit' },
    })

    await expect(sendPasswordReset('juan@example.com')).rejects.toThrow(
      'Too many emails sent. Please wait a moment and try again.'
    )
    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBeNull()
  })
})

describe('updatePassword', () => {
  it('updates the password through the provider', async () => {
    await updatePassword('new-secret-123')
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret-123' })
  })

  it('maps errors through toFriendlyError', async () => {
    supabase.auth.updateUser.mockResolvedValue({ error: { code: 'weak_password' } })

    await expect(updatePassword('short')).rejects.toThrow(
      'Your password must be at least 8 characters long.'
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

describe('completeAuthRedirect', () => {
  it('ignores URLs without a code or access token', async () => {
    await expect(completeAuthRedirect('palaysigla://auth/callback')).resolves.toEqual({
      type: null,
    })
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(supabase.auth.setSession).not.toHaveBeenCalled()
  })

  it('exchanges a PKCE code and infers the type from the pending return', async () => {
    await AsyncStorage.setItem(PENDING_AUTH_RETURN_KEY, 'signup')

    await expect(
      completeAuthRedirect('palaysigla://auth/callback?code=abc123')
    ).resolves.toEqual({ type: 'signup' })

    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBeNull()
  })

  it('prefers the URL type over the pending return', async () => {
    await AsyncStorage.setItem(PENDING_AUTH_RETURN_KEY, 'signup')

    await expect(
      completeAuthRedirect('palaysigla://auth/callback?code=abc123&type=recovery')
    ).resolves.toEqual({ type: 'recovery' })

    await expect(AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)).resolves.toBe('signup')
  })

  it('sets an implicit session from fragment tokens', async () => {
    await expect(
      completeAuthRedirect(
        'palaysigla://auth/callback#access_token=tok&refresh_token=ref&type=signup'
      )
    ).resolves.toEqual({ type: 'signup' })

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: 'ref',
    })
  })

  it('defaults a missing refresh token to an empty string', async () => {
    await completeAuthRedirect('palaysigla://auth/callback#access_token=tok&type=signup')

    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'tok',
      refresh_token: '',
    })
  })

  it('returns a null type when nothing was remembered', async () => {
    await expect(
      completeAuthRedirect('palaysigla://auth/callback?code=abc123')
    ).resolves.toEqual({ type: null })
  })

  it('maps a known exchange error code to a friendly Error instance', async () => {
    supabase.auth.exchangeCodeForSession.mockRejectedValue({ code: 'otp_expired' })

    await expect(completeAuthRedirect('palaysigla://auth/callback?code=stale')).rejects.toBeInstanceOf(
      Error
    )
    await expect(completeAuthRedirect('palaysigla://auth/callback?code=stale')).rejects.toThrow(
      'This link has expired. Please request a new one.'
    )
  })

  it('collapses unknown exchange failures to one honest message', async () => {
    supabase.auth.exchangeCodeForSession.mockRejectedValue(new Error('GoTrue internal detail'))

    await expect(completeAuthRedirect('palaysigla://auth/callback?code=stale')).rejects.toThrow(
      'This link is invalid or has already been used. Please request a new one.'
    )
  })
})
