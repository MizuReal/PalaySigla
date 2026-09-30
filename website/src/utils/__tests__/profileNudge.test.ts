import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasSeenProfileNudge,
  markProfileNudgeSeen,
  subscribeToProfileNudge,
  triggerProfileNudge,
} from '../profileNudge'

beforeEach(() => {
  window.localStorage.clear()
})

describe('profileNudge events', () => {
  it('notifies subscribers until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToProfileNudge(listener)

    triggerProfileNudge()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    triggerProfileNudge()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('profileNudge dismissal', () => {
  it('tracks dismissal per user', () => {
    expect(hasSeenProfileNudge('u1')).toBe(false)

    markProfileNudgeSeen('u1')

    expect(hasSeenProfileNudge('u1')).toBe(true)
    expect(hasSeenProfileNudge('u2')).toBe(false)
  })
})
