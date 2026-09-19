/// <reference types="jest" />
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

jest.mock('../../../context/authContext', () => ({ useAuth: jest.fn() }))
jest.mock('../../../hooks/useMyListings', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../SellingHistoryRow', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>(
    'react-native'
  )
  interface MockRowProps {
    listing: { id: string; title: string }
    onSelect: (listing: { id: string; title: string }) => void
  }
  function MockSellingHistoryRow({ listing, onSelect }: MockRowProps) {
    return React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: listing.title,
        onPress: () => onSelect(listing),
      },
      React.createElement(Text, null, listing.title)
    )
  }
  return { __esModule: true, default: MockSellingHistoryRow }
})

import { useAuth } from '../../../context/authContext'
import useMyListings from '../../../hooks/useMyListings'
import { notifyListingsChanged } from '../../../utils/listingEvents'
import SellingHistoryPanel from '../SellingHistoryPanel'
import type { ListingWithImages } from '../../../types/domain'

const mockedUseAuth = jest.mocked(useAuth)
const mockedUseMyListings = jest.mocked(useMyListings)

const ROW = { id: 'L1', title: 'Fresh palay' } as unknown as ListingWithImages

function mockListings(overrides: Record<string, unknown> = {}) {
  mockedUseMyListings.mockReturnValue({
    listings: [ROW],
    total: 1,
    isInitialLoading: false,
    isLoadingMore: false,
    error: '',
    loadMore: jest.fn(),
    hasMore: false,
    ...overrides,
  })
}

beforeEach(() => {
  jest.resetAllMocks()
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1' },
  } as ReturnType<typeof useAuth>)
  mockListings()
})

describe('SellingHistoryPanel', () => {
  it('renders status filters and hands selected rows to the parent', async () => {
    const onSelectListing = jest.fn()
    const screen = await render(
      <SellingHistoryPanel onSelectListing={onSelectListing} />
    )

    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Active' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sold' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Deleted' })).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'Fresh palay' }))
    expect(onSelectListing).toHaveBeenCalledWith(ROW)
  })

  it('shows the per-filter empty copy', async () => {
    mockListings({ listings: [], total: 0 })
    const screen = await render(
      <SellingHistoryPanel onSelectListing={jest.fn()} />
    )

    await fireEvent.press(screen.getByRole('button', { name: 'Sold' }))

    await waitFor(() =>
      expect(
        screen.getByText(
          'Nothing sold yet. Mark a listing as sold and it will show up here.'
        )
      ).toBeTruthy()
    )
  })

  it('shows the error panel with a retry affordance', async () => {
    mockListings({ listings: [], error: 'Could not load your listings. Please try again.' })
    const screen = await render(
      <SellingHistoryPanel onSelectListing={jest.fn()} />
    )

    expect(screen.getByRole('alert')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }))
  })

  it('reloads the list when a listing mutation is announced', async () => {
    await render(<SellingHistoryPanel onSelectListing={jest.fn()} />)
    expect(mockedUseMyListings).toHaveBeenCalledTimes(1)

    await act(() => {
      notifyListingsChanged()
    })

    await waitFor(() => expect(mockedUseMyListings).toHaveBeenCalledTimes(2))
  })
})
