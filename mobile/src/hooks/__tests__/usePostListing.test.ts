/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../context/authContext', () => ({ useAuth: jest.fn() }))
jest.mock('../../services/listings', () => ({
  createListing: jest.fn(),
  softDeleteListing: jest.fn(),
  uploadListingImage: jest.fn(),
}))
jest.mock('../../utils/listingEvents', () => ({
  notifyListingsChanged: jest.fn(),
}))

import { useAuth } from '../../context/authContext'
import {
  createListing,
  softDeleteListing,
  uploadListingImage,
} from '../../services/listings'
import { notifyListingsChanged } from '../../utils/listingEvents'
import usePostListing from '../usePostListing'
import type { PostListingInput } from '../usePostListing'

const mockedUseAuth = jest.mocked(useAuth)
const mockedCreateListing = jest.mocked(createListing)
const mockedSoftDeleteListing = jest.mocked(softDeleteListing)
const mockedUploadListingImage = jest.mocked(uploadListingImage)
const mockedNotifyListingsChanged = jest.mocked(notifyListingsChanged)

const USER = {
  id: 'u1',
  user_metadata: { full_name: 'Juan dela Cruz' },
} as unknown as ReturnType<typeof useAuth>['user']

const INPUT: PostListingInput = {
  title: 'Fresh palay',
  description: 'Dry and clean',
  price: 1200,
  unit: 'sack',
  category: 'palay',
  quantity: 50,
  lat: 14.9548,
  lng: 120.8969,
  locationLabel: 'Baliuag, Bulacan',
  image: { uri: 'file:///cache/prepared.jpg', width: 1600, height: 1200 },
}

beforeEach(() => {
  jest.resetAllMocks()
  mockedUseAuth.mockReturnValue({
    user: USER,
  } as ReturnType<typeof useAuth>)
  mockedCreateListing.mockResolvedValue('L1')
  mockedUploadListingImage.mockResolvedValue('u1/L1/0.jpg')
  mockedSoftDeleteListing.mockResolvedValue(undefined)
})

describe('usePostListing', () => {
  it('creates the listing, uploads the photo, notifies, and returns the id', async () => {
    const { result } = await renderHook(() => usePostListing())

    let listingId = ''
    await act(async () => {
      listingId = await result.current.postListing(INPUT)
    })

    expect(listingId).toBe('L1')
    expect(mockedCreateListing).toHaveBeenCalledWith({
      userId: 'u1',
      title: 'Fresh palay',
      description: 'Dry and clean',
      price: 1200,
      unit: 'sack',
      category: 'palay',
      quantity: 50,
      lat: 14.9548,
      lng: 120.8969,
      locationLabel: 'Baliuag, Bulacan',
      sellerName: 'Juan dela Cruz',
    })
    expect(mockedUploadListingImage).toHaveBeenCalledWith(INPUT.image, 'L1', 'u1')
    expect(mockedNotifyListingsChanged).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('')
    expect(result.current.isSubmitting).toBe(false)
  })

  it('rolls the listing back when the photo upload fails', async () => {
    mockedUploadListingImage.mockRejectedValue(
      new Error('Could not upload the photo. Please try again.')
    )
    const { result } = await renderHook(() => usePostListing())

    await act(async () => {
      await expect(result.current.postListing(INPUT)).rejects.toThrow(
        'Could not upload the photo. Please try again.'
      )
    })

    expect(mockedSoftDeleteListing).toHaveBeenCalledWith('L1')
    expect(mockedNotifyListingsChanged).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(result.current.error).toBe('Could not upload the photo. Please try again.')
    )
  })

  it('does not roll back when creating the listing itself fails', async () => {
    mockedCreateListing.mockRejectedValue(
      new Error('Could not create the listing. Please try again.')
    )
    const { result } = await renderHook(() => usePostListing())

    await act(async () => {
      await expect(result.current.postListing(INPUT)).rejects.toThrow(
        'Could not create the listing. Please try again.'
      )
    })

    expect(mockedSoftDeleteListing).not.toHaveBeenCalled()
    expect(mockedUploadListingImage).not.toHaveBeenCalled()
  })

  it('rejects when signed out without touching the services', async () => {
    mockedUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>)
    const { result } = await renderHook(() => usePostListing())

    await act(async () => {
      await expect(result.current.postListing(INPUT)).rejects.toThrow(
        'You must be signed in to post a listing.'
      )
    })

    expect(mockedCreateListing).not.toHaveBeenCalled()
  })
})
