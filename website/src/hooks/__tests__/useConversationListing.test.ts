import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/listings', () => ({
  getListing: vi.fn(),
  getListingImageUrl: vi.fn(),
}))

import { getListing, getListingImageUrl } from '../../services/listings'
import type { ConversationRow, ListingWithImages } from '../../types/domain'
import useConversationListing from '../useConversationListing'

const getListingMock = vi.mocked(getListing)
const getListingImageUrlMock = vi.mocked(getListingImageUrl)

function conversation(listingId: string | null): ConversationRow {
  return { id: 'c1', listing_id: listingId, listing_title: 'Palay harvest' } as ConversationRow
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('useConversationListing', () => {
  it('enriches the conversation with the live listing and its photo', async () => {
    const listing = {
      id: 'L1',
      title: 'Palay harvest',
      listing_images: [{ storage_path: 'u1/L1/0.jpg' }],
    } as ListingWithImages
    getListingMock.mockResolvedValue(listing)
    getListingImageUrlMock.mockResolvedValue('https://signed.test/L1')

    const { result } = renderHook(() => useConversationListing(conversation('L1')))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListing).toHaveBeenCalledWith('L1')
    expect(getListingImageUrl).toHaveBeenCalledWith('u1/L1/0.jpg')
    expect(result.current.listing).toEqual(listing)
    expect(result.current.imageUrl).toBe('https://signed.test/L1')
    expect(result.current.isUnavailable).toBe(false)
  })

  it('reports no product context when the conversation has no listing', async () => {
    const { result } = renderHook(() => useConversationListing(conversation(null)))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(getListing).not.toHaveBeenCalled()
    expect(result.current.listing).toBeNull()
    expect(result.current.imageUrl).toBe('')
    expect(result.current.isUnavailable).toBe(false)
  })

  it('degrades to unavailable when the listing cannot be read', async () => {
    getListingMock.mockRejectedValue(new Error('That listing could not be found.'))

    const { result } = renderHook(() => useConversationListing(conversation('gone')))
    await waitFor(() => expect(result.current.isUnavailable).toBe(true))

    expect(result.current.listing).toBeNull()
    expect(result.current.imageUrl).toBe('')
    expect(result.current.isLoading).toBe(false)
  })

  it('does nothing without a conversation', async () => {
    const { result } = renderHook(() => useConversationListing(null))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(getListing).not.toHaveBeenCalled()
    expect(result.current.isUnavailable).toBe(false)
  })
})
