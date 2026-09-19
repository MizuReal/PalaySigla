/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  LISTING_STATUSES: { ACTIVE: 'active', SOLD: 'sold' },
  softDeleteListing: jest.fn(),
  updateListingStatus: jest.fn(),
}))
jest.mock('../../utils/listingEvents', () => ({
  notifyListingsChanged: jest.fn(),
}))

import { softDeleteListing, updateListingStatus } from '../../services/listings'
import { notifyListingsChanged } from '../../utils/listingEvents'
import useListingActions from '../useListingActions'

const mockedUpdateListingStatus = jest.mocked(updateListingStatus)
const mockedSoftDeleteListing = jest.mocked(softDeleteListing)
const mockedNotifyListingsChanged = jest.mocked(notifyListingsChanged)

beforeEach(() => {
  jest.resetAllMocks()
  mockedUpdateListingStatus.mockResolvedValue(undefined)
  mockedSoftDeleteListing.mockResolvedValue(undefined)
})

describe('useListingActions', () => {
  it('marks a listing as sold and notifies', async () => {
    const { result } = await renderHook(() => useListingActions())

    let succeeded = false
    await act(async () => {
      succeeded = await result.current.markSold('L1')
    })

    expect(succeeded).toBe(true)
    expect(mockedUpdateListingStatus).toHaveBeenCalledWith('L1', 'sold')
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('')
    expect(result.current.isActing).toBe(false)
  })

  it('reports a failed status update without notifying', async () => {
    mockedUpdateListingStatus.mockRejectedValue(
      new Error('Could not update the listing. Please try again.')
    )
    const { result } = await renderHook(() => useListingActions())

    let succeeded = true
    await act(async () => {
      succeeded = await result.current.markSold('L1')
    })

    expect(succeeded).toBe(false)
    expect(mockedNotifyListingsChanged).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(result.current.error).toBe(
        'Could not update the listing. Please try again.'
      )
    )
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
