// Auth return-URL helpers for mobile. Verification and password-reset emails
// point back at the app's own URL scheme, but supabase-js never inspects a
// URL on React Native — the AuthProvider deep-link listener does the hand-off
// through services/auth.js. This module only builds and parses URLs (pure
// string work, no supabase calls), mirroring the website's authUrlHint role:
// the web snapshots location.hash; mobile constructs and reads its own links.
import * as Linking from 'expo-linking'

// Path the email links return to: <scheme>://…/auth/callback?code=… (PKCE)
// or …/auth/callback#access_token=… (implicit). Kept in one place so the
// Supabase dashboard redirect allow-list and this app never drift apart.
export const AUTH_RETURN_PATH = 'auth/callback'

export function createAuthReturnUrl() {
  const configured = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL
  if (configured) {
    return configured
  }
  // No override: return the live deep-link URL (expo://…/--/auth/callback in
  // Expo Go), which is exactly what the user's email client opens
  return Linking.createURL(AUTH_RETURN_PATH)
}

function collectParams(params, segment) {
  for (const pair of segment.split('&')) {
    if (!pair) {
      continue
    }
    const equalsIndex = pair.indexOf('=')
    const rawKey = equalsIndex === -1 ? pair : pair.slice(0, equalsIndex)
    const rawValue = equalsIndex === -1 ? '' : pair.slice(equalsIndex + 1)
    let key = ''
    let value = ''
    try {
      key = decodeURIComponent(rawKey)
      value = decodeURIComponent(rawValue)
    } catch {
      // malformed escape sequence: skip the pair, never crash the URL handler
      continue
    }
    if (key) {
      params[key] = value
    }
  }
}

// Splits a raw deep link into decoded params, reading both the query string
// (PKCE ?code=…) and the URL fragment (implicit #access_token=…) — both can
// carry a session depending on the Supabase flow type, so neither is assumed.
export function parseAuthRedirectUrl(rawUrl) {
  const params = {}
  const hashIndex = rawUrl.indexOf('#')
  const beforeHash = hashIndex === -1 ? rawUrl : rawUrl.slice(0, hashIndex)
  const queryIndex = beforeHash.indexOf('?')
  if (queryIndex !== -1) {
    collectParams(params, beforeHash.slice(queryIndex + 1))
  }
  if (hashIndex !== -1) {
    collectParams(params, rawUrl.slice(hashIndex + 1))
  }
  return params
}
