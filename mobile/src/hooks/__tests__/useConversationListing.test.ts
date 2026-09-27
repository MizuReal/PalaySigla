/// <reference types="jest" />
import { renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../../services/listings', () => ({
  getListing: jest.fn(),
  getListingImageUrl: jest.fn(),
}))

import { getListing, getListingImageUrl } from '../../services/listings'
import type { ConversationRow, ListingWithImages } from '../../types/domain'
import useConversationListing from '../useConversationListing'

const mockedGetListing = jest.mocked(getListing)
const mockedGetListingImageUrl = jest.mocked(getListingImageUrl)

function conversation(listingId: string | null): ConversationRow {
  return { id: 'c1', listing_id: listingId, listing_title: 'Palay harvest' } as ConversationRow
}

beforeEach(() => {
  jest.resetAllMocks()
})

describe('useConversationListing', () => {
  it('enriches the conversation with the live listing and its photo', async () => {
    const listing = {
      id: 'L1',
      title: 'Palay harvest',
      listing_images: [{ storage_path: 'u1/L1/0.jpg' }],
    } as ListingWithImages
    mockedGetListing.mockResolvedValue(listing)
    mockedGetListingImageUrl.mockResolvedValue('https://signed.test/L1')

    const { result } = await renderHook(() => useConversationListing(conversation('L1')))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGetListing).toHaveBeenCalledWith('L1')
    expect(result.current.listing).toEqual(listing)
    expect(result.current.imageUrl).toBe('https://signed.test/L1')
    expect(result.current.isUnavailable).toBe(false)
  })

  it('reports no product context when the conversation has no listing', async () => {
    const { result } = await renderHook(() => useConversationListing(conversation(null)))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockedGetListing).not.toHaveBeenCalled()
    expect(result.current.listing).toBeNull()
    expect(result.current.isUnavailable).toBe(false)
  })

  it('degrades to unavailable when the listing cannot be read', async () => {
    mockedGetListing.mockRejectedValue(new Error('That listing could not be found.'))

    const { result } = await renderHook(() => useConversationListing(conversation('gone')))
    await waitFor(() => expect(result.current.isUnavailable).toBe(true))

    expect(result.current.listing).toBeNull()
    expect(result.current.isLoading).toBe(false)
  })
})
