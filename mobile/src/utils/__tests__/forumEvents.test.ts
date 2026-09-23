/// <reference types="jest" />
import { notifyForumChanged, subscribeToForumChanged } from '../forumEvents'

describe('forumEvents', () => {
  it('notifies every subscriber', () => {
    const first = jest.fn()
    const second = jest.fn()
    const unsubscribeFirst = subscribeToForumChanged(first)
    const unsubscribeSecond = subscribeToForumChanged(second)

    notifyForumChanged()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    unsubscribeSecond()
  })

  it('stops notifying unsubscribed listeners', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeToForumChanged(listener)

    unsubscribe()
    notifyForumChanged()

    expect(listener).not.toHaveBeenCalled()
  })
})
