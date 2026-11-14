// Email links must return to the deployed site, not to whatever localhost
// value happens to be configured as the Supabase Site URL. The environment
// value is set per deployment; the origin fallback keeps previews usable.
export function getAuthRedirectUrl(): string {
  const configured = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (configured) {
    return configured
  }
  return typeof window === 'undefined' ? '' : window.location.origin
}
