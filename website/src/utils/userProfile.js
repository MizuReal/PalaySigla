export function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || 'Account'
}

// monogram fallback for the avatar circle: first letters of the first and
// last words (a single bullet when the name yields nothing)
export function getInitials(name) {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase() || '\u2022'
}
