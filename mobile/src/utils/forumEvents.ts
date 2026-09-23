// Module-level pub/sub for forum mutations (post published/edited/removed,
// comment added/removed, hearts). The community feed and its category counts
// subscribe once and refresh, mirroring the listings-changed broadcast so a
// change made in a thread refreshes the surfaces behind it.
type ForumChangedListener = () => void

const listeners = new Set<ForumChangedListener>()

export function notifyForumChanged(): void {
  // iterate a copy: a listener may unsubscribe while reacting to the event
  for (const listener of [...listeners]) {
    listener()
  }
}

export function subscribeToForumChanged(listener: ForumChangedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
