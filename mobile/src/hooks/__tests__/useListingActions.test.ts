/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  LISTING_STATUSES: { ACTIVE: 'active', RESERVED: 'reserved', SOLD: 'sold' },
  reserveListing: jest.fn(),
  markListingSold: jest.fn(),
  clearListingReservation: jest.fn(),
  softDeleteListing: jest.fn(),
}))
jest.mock('../../utils/listingEvents', () => ({
  notifyListingsChanged: jest.fn(),
}))

import {
  clearListingReservation,
  markListingSold,
  reserveListing,
  softDeleteListing,
} from '../../services/listings'
import { notifyListingsChanged } from '../../utils/listingEvents'
import useListingActions from '../useListingActions'

const mockedReserveListing = jest.mocked(reserveListing)
const mockedMarkListingSold = jest.mocked(markListingSold)
const mockedClearListingReservation = jest.mocked(clearListingReservation)
const mockedSoftDeleteListing = jest.mocked(softDeleteListing)
const mockedNotifyListingsChanged = jest.mocked(notifyListingsChanged)

beforeEach(() => {
  jest.resetAllMocks()
  mockedReserveListing.mockResolvedValue(undefined)
  mockedMarkListingSold.mockResolvedValue(undefined)
  mockedClearListingReservation.mockResolvedValue(undefined)
  mockedSoftDeleteListing.mockResolvedValue(undefined)
})

describe('useListingActions', () => {
  it('reserves for a buyer and notifies', async () => {
    const { result } = await renderHook(() => useListingActions())

    let succeeded = false
    await act(async () => {
      succeeded = await result.current.reserve('L1', { buyerId: 'b1', buyerName: 'Bata' })
    })

    expect(succeeded).toBe(true)
    expect(mockedReserveListing).toHaveBeenCalledWith('L1', {
      buyerId: 'b1',
      buyerName: 'Bata',
    })
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('')
    expect(result.current.isActing).toBe(false)
  })

  it('marks a listing as sold to a buyer and notifies', async () => {
    const { result } = await renderHook(() => useListingActions())

    let succeeded = false
    await act(async () => {
      succeeded = await result.current.markSold('L1', { buyerId: 'b1', buyerName: 'Bata' })
    })

    expect(succeeded).toBe(true)
    expect(mockedMarkListingSold).toHaveBeenCalledWith('L1', {
      buyerId: 'b1',
      buyerName: 'Bata',
    })
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
  })

  it('reports a failed status update without notifying', async () => {
    mockedMarkListingSold.mockRejectedValue(
      new Error('Could not mark the listing as sold. Please try again.')
    )
    const { result } = await renderHook(() => useListingActions())

    let succeeded = true
    await act(async () => {
      succeeded = await result.current.markSold('L1', null)
    })

    expect(succeeded).toBe(false)
    expect(mockedNotifyListingsChanged).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Could not mark the listing as sold. Please try again.'
      )
    )
  })

  it('releases a reservation and notifies', async () => {
    const { result } = await renderHook(() => useListingActions())

    let succeeded = false
    await act(async () => {
      succeeded = await result.current.release('L1')
    })

    expect(succeeded).toBe(true)
    expect(mockedClearListingReservation).toHaveBeenCalledWith('L1')
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
  })

  it('removes a listing and notifies', async () => {
    const { result } = await renderHook(() => useListingActions())

    let succeeded = false
    await act(async () => {
      succeeded = await result.current.remove('L1')
    })

    expect(succeeded).toBe(true)
    expect(mockedSoftDeleteListing).toHaveBeenCalledWith('L1')
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
  })

  it('reports a failed remove', async () => {
    mockedSoftDeleteListing.mockRejectedValue(
      new Error('Could not remove the listing. Please try again.')
    )
    const { result } = await renderHook(() => useListingActions())

    let succeeded = true
    await act(async () => {
      succeeded = await result.current.remove('L1')
    })

    expect(succeeded).toBe(false)
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Could not remove the listing. Please try again.'
      )
    )
  })

  it('clears the error on demand', async () => {
    mockedSoftDeleteListing.mockRejectedValue(new Error('boom'))
    const { result } = await renderHook(() => useListingActions())
    await act(async () => {
      await result.current.remove('L1')
    })
    await waitFor(() => expect(result.current.error).toBe('boom'))

    await act(() => result.current.clearError())

    expect(result.current.error).toBe('')
  })
})
