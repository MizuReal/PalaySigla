const NUDGE_EVENT = 'palaysigla:credentials-nudge'
const NUDGE_STORAGE_PREFIX = 'palaysigla:credentials-nudge:'

// The registration form stays lean; the credentials nudge is a separate modal
// fired by the auth surfaces once an account exists. The event indirection
// keeps AuthModal/AuthToasts from having to know where the modal is mounted.
export function triggerProfileNudge(): void {
  window.dispatchEvent(new CustomEvent(NUDGE_EVENT))
}

export function subscribeToProfileNudge(listener: () => void): () => void {
  window.addEventListener(NUDGE_EVENT, listener)
  return () => window.removeEventListener(NUDGE_EVENT, listener)
}

export function hasSeenProfileNudge(userId: string): boolean {
  try {
    return window.localStorage.getItem(`${NUDGE_STORAGE_PREFIX}${userId}`) === '1'
  } catch {
    // storage can be unavailable (private mode); showing the prompt again is
    // safer than failing the auth flow
    return false
  }
}

export function markProfileNudgeSeen(userId: string): void {
  try {
    window.localStorage.setItem(`${NUDGE_STORAGE_PREFIX}${userId}`, '1')
  } catch {
    // best-effort: without storage the prompt may reappear in this browser
  }
}
