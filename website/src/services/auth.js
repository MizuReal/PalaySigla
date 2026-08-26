import { supabase } from './supabaseClient.js'

export const PASSWORD_MIN_LENGTH = 8

// bcrypt ceiling: Supabase hashes with bcrypt, which ignores bytes past 72
export const PASSWORD_MAX_LENGTH = 72

const ERROR_MESSAGES = {
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
}

function toFriendlyError(error) {
  const normalizedCode = String(error?.code ?? '')
    .toLowerCase()
    .replace(/-/g, '_')
  return {
    message:
      ERROR_MESSAGES[normalizedCode] ??
      error?.message ??
      'Something went wrong. Please try again.',
  }
}

export async function signInWithEmail(email, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) {
    throw toFriendlyError(error)
  }
}

export async function signUpWithEmail(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  })
  if (error) {
    throw toFriendlyError(error)
  }
  // a null session means email confirmation is required before first sign-in
  return { requiresEmailConfirmation: data.session === null }
}

export async function sendPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: import.meta.env.VITE_AUTH_REDIRECT_URL,
  })
  if (error) {
    throw toFriendlyError(error)
  }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw toFriendlyError(error)
  }
}
