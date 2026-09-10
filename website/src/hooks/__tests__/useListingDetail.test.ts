import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/listings.js', () => ({
  getListing: vi.fn(),
  getListingImageUrl: vi.fn(),
}))

import { getListing, getListingImageUrl } from '../../services/listings.js'
import type { ListingWithImages } from '../../types/domain.js'
import useListingDetail from '../useListingDetail.js'

const getListingMock = vi.mocked(getListing)
const getListingImageUrlMock = vi.mocked(getListingImageUrl)

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useListingDetail', () => {
  it('loads the listing and resolves its first image URL', async () => {
    // partial row: the hook only reads id, title, and listing_images
    const listing = {
      id: 'L1',
      title: 'Palay',
      listing_images: [{ storage_path: 'u1/L1/0.jpg' }],
    } as ListingWithImages
    getListingMock.mockResolvedValue(listing)
    getListingImageUrlMock.mockResolvedValue('https://signed.test/L1')

    const { result } = renderHook(() => useListingDetail('L1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListing).toHaveBeenCalledWith('L1')
    expect(getListingImageUrl).toHaveBeenCalledWith('u1/L1/0.jpg')
    expect(result.current.listing).toEqual(listing)
    expect(result.current.imageUrl).toBe('https://signed.test/L1')
    expect(result.current.error).toBe('')
  })

  it('resolves an empty image URL when the listing has no photos', async () => {
    // minimal fixture: the hook only reads id and listing_images
    getListingMock.mockResolvedValue({
      id: 'L2',
      listing_images: [],
    } as unknown as ListingWithImages)

    const { result } = renderHook(() => useListingDetail('L2'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current.imageUrl).toBe('')
    expect(result.current.error).toBe('')
  })

  it('handles listings without a listing_images key', async () => {
    // minimal fixture: a listing without the listing_images key at all
    getListingMock.mockResolvedValue({ id: 'L3' } as ListingWithImages)

    const { result } = renderHook(() => useListingDetail('L3'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListingImageUrl).not.toHaveBeenCalled()
    expect(result.current.imageUrl).toBe('')
  })

  it('surfaces load failures as an error message', async () => {
    getListingMock.mockRejectedValue(new Error('That listing could not be found.'))

    const { result } = renderHook(() => useListingDetail('missing'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('That listing could not be found.')
    expect(result.current.listing).toBeNull()
    expect(result.current.imageUrl).toBe('')
  })
})
