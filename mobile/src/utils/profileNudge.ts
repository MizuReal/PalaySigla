// Credentials nudge state. Native equivalent of the web helper: the event is
// an in-process listener set (no window) and the once-per-account dismissal
// lives in AsyncStorage so it survives app restarts.
import AsyncStorage from '@react-native-async-storage/async-storage'

const NUDGE_STORAGE_PREFIX = 'palaysigla:credentials-nudge:'

const listeners = new Set<() => void>()

export function triggerProfileNudge(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeToProfileNudge(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export async function hasSeenProfileNudge(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(`${NUDGE_STORAGE_PREFIX}${userId}`)) === '1'
  } catch {
    // storage can be unavailable; showing the prompt again is safer than
    // failing the auth flow
    return false
  }
}

export async function markProfileNudgeSeen(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(`${NUDGE_STORAGE_PREFIX}${userId}`, '1')
  } catch {
    // best-effort: without storage the prompt may reappear on this device
  }
}
