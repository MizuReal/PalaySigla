import { renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  getListing: jest.fn(),
  getListingImageUrl: jest.fn(),
}))

import { getListing, getListingImageUrl } from '../../services/listings'
import useListingDetail from '../useListingDetail.js'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useListingDetail', () => {
  it('loads the listing and resolves its first image URL', async () => {
    const listing = {
      id: 'L1',
      title: 'Palay',
      listing_images: [{ storage_path: 'u1/L1/0.jpg' }],
    }
    getListing.mockResolvedValue(listing)
    getListingImageUrl.mockResolvedValue('https://signed.test/L1')

    const { result } = await renderHook(() => useListingDetail('L1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListing).toHaveBeenCalledWith('L1')
    expect(getListingImageUrl).toHaveBeenCalledWith('u1/L1/0.jpg')
    expect(result.current.listing).toEqual(listing)
    expect(result.current.imageUrl).toBe('https://signed.test/L1')
    expect(result.current.error).toBe('')
  })

  it('resolves an empty image URL when the listing has no photos', async () => {
    getListing.mockResolvedValue({ id: 'L2', listing_images: [] })

    const { result } = await renderHook(() => useListingDetail('L2'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current.imageUrl).toBe('')
    expect(result.current.error).toBe('')
  })

  it('handles listings without a listing_images key', async () => {
    getListing.mockResolvedValue({ id: 'L3' })

    const { result } = await renderHook(() => useListingDetail('L3'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current.imageUrl).toBe('')
  })

  it('surfaces load failures as an error message', async () => {
    getListing.mockRejectedValue(new Error('That listing could not be found.'))

    const { result } = await renderHook(() => useListingDetail('missing'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('That listing could not be found.')
    expect(result.current.listing).toBeNull()
    expect(result.current.imageUrl).toBe('')
  })
})
