/// <reference types="jest" />
import {
  hasSeenProfileNudge,
  markProfileNudgeSeen,
  subscribeToProfileNudge,
  triggerProfileNudge,
} from '../profileNudge'

describe('profileNudge events', () => {
  it('notifies subscribers until they unsubscribe', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeToProfileNudge(listener)

    triggerProfileNudge()
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    triggerProfileNudge()
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

describe('profileNudge dismissal', () => {
  it('tracks dismissal per user', async () => {
    expect(await hasSeenProfileNudge('u1')).toBe(false)

    await markProfileNudgeSeen('u1')

    expect(await hasSeenProfileNudge('u1')).toBe(true)
    expect(await hasSeenProfileNudge('u2')).toBe(false)
  })
})
