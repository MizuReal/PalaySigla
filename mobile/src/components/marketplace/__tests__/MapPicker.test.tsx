/// <reference types="jest" />
import type { Ref } from 'react'
import { Linking } from 'react-native'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'

interface MockWebViewProps {
  source: { html: string }
  onMessage?: (event: { nativeEvent: { data: string } }) => void
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean
  onError?: () => void
}

const mockWebViewProps: { current: MockWebViewProps | null } = { current: null }
const mockInjectJavaScript = jest.fn()

// The native WebView is replaced by a prop-capturing null component so the
// test can drive bridge messages and assert injected scripts directly.
jest.mock('react-native-webview', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  function MockWebView(props: MockWebViewProps, ref: Ref<unknown>) {
    mockWebViewProps.current = props
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInjectJavaScript }))
    return null
  }
  return { WebView: React.forwardRef(MockWebView) }
})

jest.mock('../../../services/geocode', () => ({
  searchPlace: jest.fn(),
  reverseGeocode: jest.fn(),
}))

import type { GeocodeResult } from '../../../types/api'
import { searchPlace, reverseGeocode } from '../../../services/geocode'
import MapPicker from '../MapPicker'

const mockedSearchPlace = jest.mocked(searchPlace)
const mockedReverseGeocode = jest.mocked(reverseGeocode)

const RESULT: GeocodeResult = {
  place_id: 101,
  label: 'Baliuag, Bulacan, Philippines',
  lat: 14.9548,
  lng: 120.8969,
  place_type: 'town',
}

const onPositionChange = jest.fn()
const onLocationLabel = jest.fn()

function renderPicker(position: [number, number] | null = null) {
  return render(
    <MapPicker
      position={position}
      onPositionChange={onPositionChange}
      onLocationLabel={onLocationLabel}
    />
  )
}

type Screen = Awaited<ReturnType<typeof renderPicker>>

async function postBridgeMessage(message: unknown) {
  const onMessage = mockWebViewProps.current?.onMessage
  if (!onMessage) {
    throw new Error('The WebView bridge is not mounted.')
  }
  await act(() => {
    onMessage({ nativeEvent: { data: JSON.stringify(message) } })
  })
}

async function pressSearch(screen: Screen, query: string) {
  await fireEvent.changeText(screen.getByLabelText('Search for a place'), query)
  await fireEvent.press(screen.getByRole('button', { name: 'Search' }))
}

beforeEach(() => {
  mockWebViewProps.current = null
  mockInjectJavaScript.mockClear()
  mockedSearchPlace.mockReset()
  mockedReverseGeocode.mockReset()
  onPositionChange.mockReset()
  onLocationLabel.mockReset()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('MapPicker', () => {
  it('renders the Leaflet document for the initial position', async () => {
    await renderPicker([RESULT.lat, RESULT.lng])

    expect(mockWebViewProps.current?.source.html).toContain(
      'setMarker(14.9548, 120.8969, false);'
    )
  })

  it('syncs a parent position onto the map once the bridge is ready', async () => {
    const screen = await renderPicker(null)

    expect(mockInjectJavaScript).not.toHaveBeenCalled()
    await postBridgeMessage({ type: 'ready' })

    const nextPosition: [number, number] = [14.9, 120.9]
    await screen.rerender(
      <MapPicker
        position={nextPosition}
        onPositionChange={onPositionChange}
        onLocationLabel={onLocationLabel}
      />
    )

    await waitFor(() =>
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        'window.setMarker && window.setMarker(14.9, 120.9, false); true;'
      )
    )
  })

  it('searches through the backend and reports a picked result', async () => {
    mockedSearchPlace.mockResolvedValue([RESULT])
    mockedReverseGeocode.mockResolvedValue(RESULT)
    const screen = await renderPicker(null)

    await pressSearch(screen, 'Baliuag')

    await waitFor(() => expect(mockedSearchPlace).toHaveBeenCalledWith('Baliuag', 5))
    await fireEvent.press(await screen.findByRole('button', { name: RESULT.label }))

    await waitFor(() =>
      expect(onPositionChange).toHaveBeenCalledWith([RESULT.lat, RESULT.lng])
    )
    await waitFor(() =>
      expect(onLocationLabel).toHaveBeenCalledWith(RESULT.label)
    )
  })

  it('shows the empty state when no places match', async () => {
    mockedSearchPlace.mockResolvedValue([])
    const screen = await renderPicker(null)

    await pressSearch(screen, 'Nowhere')

    expect(
      await screen.findByText('No places found. Try a nearby town or barangay.')
    ).toBeTruthy()
  })

  it('surfaces search failures', async () => {
    mockedSearchPlace.mockRejectedValue(
      new Error('Location service is busy. Please try again shortly.')
    )
    const screen = await renderPicker(null)

    await pressSearch(screen, 'Baliuag')

    expect(
      await screen.findByText('Location service is busy. Please try again shortly.')
    ).toBeTruthy()
    expect(onPositionChange).not.toHaveBeenCalled()
  })

  it('turns a map pick into a position change and a reverse-geocoded label', async () => {
    mockedReverseGeocode.mockResolvedValue(RESULT)
    await renderPicker(null)

    await postBridgeMessage({ type: 'pick', lat: 14.9, lng: 120.9 })

    await waitFor(() => expect(onPositionChange).toHaveBeenCalledWith([14.9, 120.9]))
    await waitFor(() => expect(onLocationLabel).toHaveBeenCalledWith(RESULT.label))
  })

  it('clears the label when reverse geocoding fails', async () => {
    mockedReverseGeocode.mockRejectedValue(new Error('busy'))
    await renderPicker(null)

    await postBridgeMessage({ type: 'pick', lat: 14.9, lng: 120.9 })

    await waitFor(() => expect(onLocationLabel).toHaveBeenLastCalledWith(''))
    expect(onPositionChange).toHaveBeenCalledWith([14.9, 120.9])
  })

  it('ignores malformed bridge payloads', async () => {
    await renderPicker(null)

    await postBridgeMessage({ type: 'pick', lat: 'not-a-number', lng: 120.9 })

    expect(onPositionChange).not.toHaveBeenCalled()
    expect(mockedReverseGeocode).not.toHaveBeenCalled()
  })

  it('shows a reload affordance when the map fails to load', async () => {
    const screen = await renderPicker(null)

    await act(() => {
      mockWebViewProps.current?.onError?.()
    })

    expect(
      await screen.findByText('The map could not load. Check your connection.')
    ).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'Reload map' }))

    await waitFor(() =>
      expect(
        screen.queryByText('The map could not load. Check your connection.')
      ).toBeNull()
    )
    expect(mockWebViewProps.current).not.toBeNull()
  })

  it('opens attribution links outside the webview', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await renderPicker(null)

    const shouldStartLoad = mockWebViewProps.current?.onShouldStartLoadWithRequest
    expect(shouldStartLoad?.({ url: 'about:blank' })).toBe(true)
    expect(
      shouldStartLoad?.({ url: 'https://www.openstreetmap.org/copyright' })
    ).toBe(false)

    await waitFor(() =>
      expect(openURL).toHaveBeenCalledWith('https://www.openstreetmap.org/copyright')
    )
  })
})
