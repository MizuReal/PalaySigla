export function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || 'Account'
}
