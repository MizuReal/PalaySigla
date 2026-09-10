interface DisplayNameSource {
  user_metadata?: { full_name?: string | null } | null
  email?: string | null
}

// Verbatim port of the website's utils/userProfile.ts.
export function getDisplayName(user: DisplayNameSource | null | undefined): string {
  return user?.user_metadata?.full_name || user?.email || 'Account'
}
