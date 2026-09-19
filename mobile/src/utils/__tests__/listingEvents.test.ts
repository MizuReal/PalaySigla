/// <reference types="jest" />
import { notifyListingsChanged, subscribeToListingsChanged } from '../listingEvents'

describe('listingEvents', () => {
  it('notifies every subscriber', () => {
    const first = jest.fn()
    const second = jest.fn()
    const unsubscribeFirst = subscribeToListingsChanged(first)
    const unsubscribeSecond = subscribeToListingsChanged(second)

    notifyListingsChanged()

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    unsubscribeFirst()
    unsubscribeSecond()
  })

  it('stops notifying unsubscribed listeners', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeToListingsChanged(listener)

    unsubscribe()
    notifyListingsChanged()

    expect(listener).not.toHaveBeenCalled()
  })

  it('lets a listener unsubscribe while the event is being delivered', () => {
    const listener = jest.fn()
    const unsubscribe = subscribeToListingsChanged(() => {
      listener()
      unsubscribe()
    })

    expect(() => notifyListingsChanged()).not.toThrow()
    notifyListingsChanged()

    expect(listener).toHaveBeenCalledTimes(1)
  })
})
