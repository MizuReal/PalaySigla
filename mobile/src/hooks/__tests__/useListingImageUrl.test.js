import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  getListingImageUrl: jest.fn(),
}))

import { getListingImageUrl } from '../../services/listings'
import useListingImageUrl from '../useListingImageUrl.js'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useListingImageUrl', () => {
  it('resolves the signed URL for a storage path', async () => {
    getListingImageUrl.mockResolvedValue('https://signed.test/photo')

    const { result } = await renderHook(() => useListingImageUrl('u1/L1/0.jpg'))
    await waitFor(() => expect(result.current).toBe('https://signed.test/photo'))

    expect(getListingImageUrl).toHaveBeenCalledWith('u1/L1/0.jpg')
  })

  it('stays empty and never queries when no path is provided', async () => {
    const { result } = await renderHook(() => useListingImageUrl(''))
    await act(async () => {})

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current).toBe('')
  })

  it('degrades to an empty string when the lookup fails', async () => {
    getListingImageUrl.mockRejectedValue(new Error('Could not load the listing photo.'))

    const { result } = await renderHook(() => useListingImageUrl('u1/L1/0.jpg'))
    await waitFor(() => expect(getListingImageUrl).toHaveBeenCalledTimes(1))
    await act(async () => {})

    expect(result.current).toBe('')
  })
})
