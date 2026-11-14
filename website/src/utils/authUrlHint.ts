// snapshotted at module load, before supabase-js consumes and strips the
// fragment from the URL on auth initialization
const AUTH_HASH = typeof window === 'undefined' ? '' : window.location.hash.slice(1)

export interface AuthUrlHint {
  type: string | null
  error: string | null
  errorCode: string | null
  errorDescription: string | null
}

export function parseAuthUrlHash(hash: string): AuthUrlHint {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return {
    type: params.get('type'),
    error: params.get('error'),
    errorCode: params.get('error_code'),
    errorDescription: params.get('error_description'),
  }
}

const AUTH_HINT: AuthUrlHint = Object.freeze(parseAuthUrlHash(AUTH_HASH))

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  otp_expired:
    'This email link has expired or was already used. Please request a new link.',
  access_denied:
    'Sign-in was cancelled or the link is invalid. Please try again or request a new link.',
}

const DEFAULT_AUTH_ERROR_MESSAGE =
  'We could not complete sign-in. Please try again.'

export function getAuthUrlHint(): AuthUrlHint {
  return AUTH_HINT
}

export function getAuthErrorMessage(hint: AuthUrlHint): string | null {
  const code = (hint.errorCode || hint.error || '').toLowerCase()
  if (!code) {
    return null
  }
  return AUTH_ERROR_MESSAGES[code] ?? DEFAULT_AUTH_ERROR_MESSAGE
}

export function clearAuthUrlHash(): void {
  if (typeof window === 'undefined') {
    return
  }
  const { pathname, search } = window.location
  window.history.replaceState({}, '', `${pathname}${search}`)
}
