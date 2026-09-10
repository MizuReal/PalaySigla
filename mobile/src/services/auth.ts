// Auth service — mobile port of website/src/services/auth.ts (same password
// bounds, friendly-error table, and toFriendlyError contract: thrown errors
// carry the UI message) plus the deep-link session hand-off mobile needs.
// Every supabase.auth call in the app funnels through this module;
// validation regexes live in utils/validation.js and return-URL helpers in
// utils/authUrlHint.ts.
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabaseClient'
import { createAuthReturnUrl, parseAuthRedirectUrl } from '../utils/authUrlHint'

export const PASSWORD_MIN_LENGTH = 8

// bcrypt ceiling: Supabase hashes with bcrypt, which ignores bytes past 72
export const PASSWORD_MAX_LENGTH = 72

// PKCE email-link returns carry only ?code= (no type); the app remembers
// which email it last sent so the deep-link listener can tell a sign-up
// confirmation from a password recovery without trusting the URL alone
const PENDING_AUTH_RETURN_KEY = 'palaysigla:pendingAuthReturn'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials:
    'The email or password you entered is incorrect. Please try again.',
  email_not_confirmed:
    'Your email has not been confirmed yet. Check your inbox for the confirmation link.',
  user_already_exists:
    'An account with this email already exists. Try logging in instead.',
  weak_password: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  over_email_send_rate_limit:
    'Too many emails sent. Please wait a moment and try again.',
  email_address_invalid: 'Please enter a valid email address.',
  password_recovery_disabled:
    'Password recovery is not enabled on this account yet.',
  network_error:
    'Could not reach the server. Check your connection and try again.',
  otp_expired: 'This link has expired. Please request a new one.',
}

// Email-link returns (code exchange / session restore) fail with raw GoTrue
// error text when the link is stale, reused, or malformed — collapse every
// non-mapped failure to one honest message instead of surfacing internals.
const AUTH_LINK_FAILED_MESSAGE =
  'This link is invalid or has already been used. Please request a new one.'

const AUTH_RETURN_TYPES = Object.freeze({
  signup: 'signup',
  recovery: 'recovery',
} as const)

export type AuthReturnType = (typeof AUTH_RETURN_TYPES)[keyof typeof AUTH_RETURN_TYPES]

interface SupabaseErrorLike {
  code?: string
  message?: string
}

function normalizeErrorCode(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? (error as { code?: unknown }).code
      : undefined
  return String(code ?? '')
    .toLowerCase()
    .replace(/-/g, '_')
}

function toFriendlyError(error: SupabaseErrorLike | null): Error {
  const normalizedCode = normalizeErrorCode(error)
  return new Error(
    ERROR_MESSAGES[normalizedCode] ??
      error?.message ??
      'Something went wrong. Please try again.'
  )
}

function isAuthReturnType(value: string | null | undefined): value is AuthReturnType {
  return value === AUTH_RETURN_TYPES.signup || value === AUTH_RETURN_TYPES.recovery
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })
  if (error) {
    throw toFriendlyError(error)
  }
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string
): Promise<{ requiresEmailConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: name.trim() },
      emailRedirectTo: createAuthReturnUrl(),
    },
  })
  if (error) {
    throw toFriendlyError(error)
  }
  // a null session means email confirmation is required before first sign-in
  if (data.session === null) {
    await rememberPendingAuthReturn(AUTH_RETURN_TYPES.signup)
  }
  return { requiresEmailConfirmation: data.session === null }
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase(),
    { redirectTo: createAuthReturnUrl() }
  )
  if (error) {
    throw toFriendlyError(error)
  }
  await rememberPendingAuthReturn(AUTH_RETURN_TYPES.recovery)
}

// Called from the in-app "set a new password" view after a recovery deep
// link handed the session over; the same 8–72 bounds apply client-side.
export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    throw toFriendlyError(error)
  }
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw toFriendlyError(error)
  }
}

// Email-link return: hands the deep link's session to supabase-js and says
// what kind of link it was. PKCE links carry ?code= (exchangeCodeForSession);
// implicit links carry the tokens in the fragment (setSession) together with
// a type param. For PKCE the type is inferred from the last email this app
// sent (the device that requested the email opens the link); anything else
// leaves the current session untouched and resolves to type: null.
export async function completeAuthRedirect(
  rawUrl: string
): Promise<{ type: AuthReturnType | null }> {
  const params = parseAuthRedirectUrl(rawUrl)
  const code = params.code
  const accessToken = params.access_token
  if (!code && !accessToken) {
    return { type: null }
  }
  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code)
    } else {
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: params.refresh_token ?? '',
      })
    }
  } catch (error) {
    const normalizedCode = normalizeErrorCode(error)
    if (ERROR_MESSAGES[normalizedCode]) {
      throw new Error(ERROR_MESSAGES[normalizedCode])
    }
    throw new Error(AUTH_LINK_FAILED_MESSAGE)
  }
  const urlType = isAuthReturnType(params.type) ? params.type : null
  const rememberedType = urlType ?? (await consumePendingAuthReturn())
  return { type: rememberedType }
}

async function rememberPendingAuthReturn(type: AuthReturnType): Promise<void> {
  // best effort: an email was just sent, so if the flag cannot be stored the
  // deep-link listener simply treats the return as a plain verified sign-in
  try {
    await AsyncStorage.setItem(PENDING_AUTH_RETURN_KEY, type)
  } catch {
    return
  }
}

async function consumePendingAuthReturn(): Promise<AuthReturnType | null> {
  let rememberedType: string | null = null
  try {
    rememberedType = await AsyncStorage.getItem(PENDING_AUTH_RETURN_KEY)
    await AsyncStorage.removeItem(PENDING_AUTH_RETURN_KEY)
  } catch {
    return null
  }
  return isAuthReturnType(rememberedType) ? rememberedType : null
}
