/// <reference types="jest" />
import { fireEvent, render, waitFor } from '@testing-library/react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'

const mockPostListing = jest.fn()

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

jest.mock('../../hooks/usePostListing', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../../hooks/useImagePicker', () => ({
  __esModule: true,
  default: jest.fn(),
}))

jest.mock('../../components/marketplace/MapPicker', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>(
    'react-native'
  )
  interface MockMapPickerProps {
    onPositionChange: (position: [number, number]) => void
    onLocationLabel: (label: string) => void
  }
  function MockMapPicker({ onPositionChange, onLocationLabel }: MockMapPickerProps) {
    return React.createElement(
      Pressable,
      {
        accessibilityRole: 'button',
        accessibilityLabel: 'pick-location',
        onPress: () => {
          onPositionChange([14.9548, 120.8969])
          onLocationLabel('Baliuag, Bulacan')
        },
      },
      React.createElement(Text, null, 'pick-location')
    )
  }
  return { __esModule: true, default: MockMapPicker }
})

jest.mock('../../components/marketplace/PostListingImageUploader', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  const { Text } = jest.requireActual<typeof import('react-native')>('react-native')
  return {
    __esModule: true,
    default: () => React.createElement(Text, null, 'uploader'),
  }
})

import useImagePicker from '../../hooks/useImagePicker'
import usePostListing from '../../hooks/usePostListing'
import PostListingScreen from '../PostListingScreen'
import type { RootStackParamList } from '../../types/navigation'

const mockedUseImagePicker = jest.mocked(useImagePicker)
const mockedUsePostListing = jest.mocked(usePostListing)

const IMAGE = {
  uri: 'file:///cache/prepared.jpg',
  width: 1600,
  height: 1200,
  base64: 'ZmFrZQ==',
}

function buildScreenProps() {
  const navigation = {
    addListener: jest.fn(() => jest.fn()),
    navigate: jest.fn(),
    goBack: jest.fn(),
  }
  const route = { key: 'PostListing-1', name: 'PostListing' as const, params: undefined }
  return {
    navigation,
    route,
    props: { navigation, route } as unknown as NativeStackScreenProps<
      RootStackParamList,
      'PostListing'
    >,
  }
}

async function pressContinue(screen: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(screen.getByRole('button', { name: 'Continue' }))
}

beforeEach(() => {
  jest.resetAllMocks()
  mockedUseImagePicker.mockReturnValue({
    image: IMAGE,
    isProcessing: false,
    error: '',
    canOpenSettings: false,
    takePhoto: jest.fn(),
    pickFromLibrary: jest.fn(),
    removeImage: jest.fn(),
    openSettings: jest.fn(),
  })
  mockedUsePostListing.mockReturnValue({
    postListing: mockPostListing,
    isSubmitting: false,
    error: '',
  })
})

describe('PostListingScreen', () => {
  it('blocks Continue on the details step and focuses the first invalid field', async () => {
    const { props, navigation } = buildScreenProps()
    const screen = await render(<PostListingScreen {...props} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText('Title must be 3-80 characters.')).toBeTruthy()
    expect(screen.getByText(/step 1 of 3/)).toBeTruthy()
    expect(mockPostListing).not.toHaveBeenCalled()

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }))
    expect(navigation.goBack).toHaveBeenCalledTimes(1)
  })

  it('walks the three steps and posts the listing', async () => {
    mockPostListing.mockResolvedValue('L1')
    const { props, navigation } = buildScreenProps()
    const screen = await render(<PostListingScreen {...props} />)

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Fresh palay')
    await fireEvent.changeText(screen.getByLabelText('Price (₱)'), '1200')
    await fireEvent.press(screen.getByRole('button', { name: 'per sack' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Palay' }))

    await pressContinue(screen)
    expect(screen.getByText(/step 2 of 3/)).toBeTruthy()

    await pressContinue(screen)
    expect(screen.getByText(/step 3 of 3/)).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'pick-location' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Post listing' }))

    await waitFor(() => expect(mockPostListing).toHaveBeenCalledTimes(1))
    expect(mockPostListing).toHaveBeenCalledWith({
      title: 'Fresh palay',
      description: '',
      price: 1200,
      unit: 'sack',
      category: 'palay',
      quantity: null,
      lat: 14.9548,
      lng: 120.8969,
      locationLabel: 'Baliuag, Bulacan',
      image: IMAGE,
    })

    expect(await screen.findByText('Listing posted!')).toBeTruthy()
    await fireEvent.press(
      screen.getByRole('button', { name: 'Back to marketplace' })
    )
    expect(navigation.navigate).toHaveBeenCalledWith('Main', {
      screen: 'Marketplace',
    })
  })

  it('requires a pinned location before submitting', async () => {
    const { props } = buildScreenProps()
    const screen = await render(<PostListingScreen {...props} />)

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Fresh palay')
    await fireEvent.changeText(screen.getByLabelText('Price (₱)'), '1200')
    await fireEvent.press(screen.getByRole('button', { name: 'per sack' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Palay' }))
    await pressContinue(screen)
    await pressContinue(screen)

    await fireEvent.press(screen.getByRole('button', { name: 'Post listing' }))

    expect(await screen.findByText('Pin your location on the map.')).toBeTruthy()
    expect(mockPostListing).not.toHaveBeenCalled()
  })

  it('surfaces a failed submission inline and stays on the wizard', async () => {
    mockPostListing.mockRejectedValue(
      new Error('Could not create the listing. Please try again.')
    )
    const { props } = buildScreenProps()
    const screen = await render(<PostListingScreen {...props} />)

    await fireEvent.changeText(screen.getByLabelText('Title'), 'Fresh palay')
    await fireEvent.changeText(screen.getByLabelText('Price (₱)'), '1200')
    await fireEvent.press(screen.getByRole('button', { name: 'per sack' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Palay' }))
    await pressContinue(screen)
    await pressContinue(screen)
    await fireEvent.press(screen.getByRole('button', { name: 'pick-location' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Post listing' }))

    expect(
      await screen.findByText('Could not create the listing. Please try again.')
    ).toBeTruthy()
    expect(screen.queryByText('Listing posted!')).toBeNull()
  })
})
