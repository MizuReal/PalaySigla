/// <reference types="jest" />
import { Linking } from 'react-native'
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

const mockGoBack = jest.fn()
const mockMarkSold = jest.fn()
const mockRemove = jest.fn()
const mockClearError = jest.fn()

interface MockLocationMapProps {
  lat: number
  lng: number
  locationLabel: string
}

const mockLocationMapProps: { current: MockLocationMapProps | null } = {
  current: null,
}

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('../../components/Photo', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('../../components/marketplace/ListingLocationMap', () => {
  function MockListingLocationMap(props: MockLocationMapProps) {
    mockLocationMapProps.current = props
    return null
  }
  return { __esModule: true, default: MockListingLocationMap }
})

jest.mock('../../hooks/useListingDetail', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../../hooks/useListingActions', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../../context/authContext', () => ({ useAuth: jest.fn() }))

import { useAuth } from '../../context/authContext'
import useListingActions from '../../hooks/useListingActions'
import useListingDetail from '../../hooks/useListingDetail'
import ListingDetailScreen from '../ListingDetailScreen'
import type { ListingWithImages } from '../../types/domain'
import type { RootStackParamList } from '../../types/navigation'

const mockedUseAuth = jest.mocked(useAuth)
const mockedUseListingActions = jest.mocked(useListingActions)
const mockedUseListingDetail = jest.mocked(useListingDetail)

const LISTING = {
  id: 'L1',
  user_id: 'u1',
  title: 'Fresh palay',
  category: 'palay',
  status: 'active',
  price: 1200,
  unit: 'sack',
  quantity: null,
  description: 'Dry and clean',
  seller_name: 'Juan',
  location_label: 'Baliuag, Bulacan',
  created_at: '2026-09-01T00:00:00Z',
  listing_images: [],
  lat: 14.9548,
  lng: 120.8969,
  sold_at: null,
  deleted_at: null,
} as unknown as ListingWithImages

function buildProps() {
  const route = {
    key: 'ListingDetail-1',
    name: 'ListingDetail' as const,
    params: { listingId: 'L1' },
  }
  return {
    navigation: { goBack: mockGoBack },
    route,
  } as unknown as NativeStackScreenProps<RootStackParamList, 'ListingDetail'>
}

beforeEach(() => {
  jest.resetAllMocks()
  mockLocationMapProps.current = null
  mockedUseListingDetail.mockReturnValue({
    listing: LISTING,
    imageUrl: '',
    isLoading: false,
    error: '',
  })
  mockedUseListingActions.mockReturnValue({
    isActing: false,
    error: '',
    markSold: mockMarkSold,
    remove: mockRemove,
    clearError: mockClearError,
  })
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1' },
  } as ReturnType<typeof useAuth>)
})

describe('ListingDetailScreen owner actions', () => {
  it('marks the owner listing as sold and leaves on success', async () => {
    mockMarkSold.mockResolvedValue(true)
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Mark as sold' }))

    await waitFor(() => expect(mockMarkSold).toHaveBeenCalledWith('L1'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('removes the listing through the inline two-tap confirm', async () => {
    mockRemove.mockResolvedValue(true)
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Remove listing' }))
    expect(
      screen.getByText('Remove this listing permanently?')
    ).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'Yes, remove it' }))

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('L1'))
    expect(mockGoBack).toHaveBeenCalledTimes(1)
  })

  it('shows an action failure inline and stays on the screen', async () => {
    mockMarkSold.mockResolvedValue(false)
    mockedUseListingActions.mockReturnValue({
      isActing: false,
      error: 'Could not update the listing. Please try again.',
      markSold: mockMarkSold,
      remove: mockRemove,
      clearError: mockClearError,
    })
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    expect(
      screen.getByText('Could not update the listing. Please try again.')
    ).toBeTruthy()
    expect(mockGoBack).not.toHaveBeenCalled()
  })

  it('hides owner actions from non-owners', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'someone-else' },
    } as ReturnType<typeof useAuth>)
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    expect(screen.queryByRole('button', { name: 'Mark as sold' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove listing' })).toBeNull()
  })
})

describe('ListingDetailScreen location section', () => {
  it('shows the map label and four-decimal coordinates', async () => {
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    expect(screen.getByText('Location')).toBeTruthy()
    expect(screen.getByText('Baliuag, Bulacan')).toBeTruthy()
    expect(screen.getByText('14.9548° N, 120.8969° E')).toBeTruthy()
    expect(mockLocationMapProps.current).toEqual({
      lat: 14.9548,
      lng: 120.8969,
      locationLabel: 'Baliuag, Bulacan',
    })
  })

  it('opens OpenStreetMap from the link', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    await fireEvent.press(
      screen.getByRole('link', { name: 'Open in OpenStreetMap' })
    )

    await waitFor(() =>
      expect(openURL).toHaveBeenCalledWith(
        expect.stringContaining('mlat=14.9548')
      )
    )
  })

  it('hides the location section without finite coordinates', async () => {
    mockedUseListingDetail.mockReturnValue({
      listing: {
        ...LISTING,
        lat: Number.NaN,
        lng: Number.NaN,
      } as ListingWithImages,
      imageUrl: '',
      isLoading: false,
      error: '',
    })
    const screen = await render(<ListingDetailScreen {...buildProps()} />)

    expect(screen.queryByText('Location')).toBeNull()
    expect(screen.queryByText('Open in OpenStreetMap')).toBeNull()
  })
})
