/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  getListingImageUrl: jest.fn(),
}))

import { getListingImageUrl } from '../../services/listings'
import useListingImageUrl from '../useListingImageUrl'

const mockedGetListingImageUrl = jest.mocked(getListingImageUrl)

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useListingImageUrl', () => {
  it('resolves the signed URL for a storage path', async () => {
    mockedGetListingImageUrl.mockResolvedValue('https://signed.test/photo')

    const { result } = await renderHook(() => useListingImageUrl('u1/L1/0.jpg'))
    await waitFor(() =>
      expect(result.current.url).toBe('https://signed.test/photo')
    )

    expect(getListingImageUrl).toHaveBeenCalledWith('u1/L1/0.jpg')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hasError).toBe(false)
  })

  it('is immediately empty and idle when no path is provided', async () => {
    const { result } = await renderHook(() => useListingImageUrl(''))
    await act(async () => {})

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current).toEqual({ url: '', isLoading: false, hasError: false })
  })

  it('reports a failed lookup without leaving a pending state', async () => {
    mockedGetListingImageUrl.mockRejectedValue(
      new Error('Could not load the listing photo.')
    )

    const { result } = await renderHook(() => useListingImageUrl('u1/L1/0.jpg'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.url).toBe('')
    expect(result.current.hasError).toBe(true)
  })
})
