// snapshotted at module load, before supabase-js consumes and strips the
// fragment from the URL on auth initialization
const AUTH_HASH = Object.freeze(
  new URLSearchParams(
    typeof window === 'undefined' ? '' : window.location.hash.slice(1)
  )
)

export interface AuthUrlHint {
  type: string | null
}

export function getAuthUrlHint(): AuthUrlHint {
  return { type: AUTH_HASH.get('type') }
}
