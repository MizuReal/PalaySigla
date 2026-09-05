// Display-name resolution for the signed-in chrome — the single shared
// helper, mirrored from website/src/utils/userProfile.js. The full name is
// captured at sign-up into user_metadata.full_name; email is the fallback.
export function getDisplayName(user) {
  return user?.user_metadata?.full_name || user?.email || 'Account'
}
