/// <reference types="jest" />
import type { Ref } from 'react'
import { Linking } from 'react-native'
import { act, render, waitFor } from '@testing-library/react-native'

const MAP_LOAD_TIMEOUT_MS = 5000

interface MockWebViewProps {
  source: { html: string }
  onMessage?: (event: { nativeEvent: { data: string } }) => void
  onShouldStartLoadWithRequest?: (request: { url: string }) => boolean
  onError?: () => void
}

const mockWebViewProps: { current: MockWebViewProps | null } = { current: null }

// The native WebView is replaced by a prop-capturing null component so the
// test can drive the ready handshake, error state, and navigation policy.
jest.mock('react-native-webview', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  function MockWebView(props: MockWebViewProps, ref: Ref<unknown>) {
    mockWebViewProps.current = props
    React.useImperativeHandle(ref, () => ({}))
    return null
  }
  return { WebView: React.forwardRef(MockWebView) }
})

import ListingLocationMap from '../ListingLocationMap'

function postBridgeMessage(message: unknown) {
  mockWebViewProps.current?.onMessage?.({ nativeEvent: { data: JSON.stringify(message) } })
}

beforeEach(() => {
  mockWebViewProps.current = null
})

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('ListingLocationMap', () => {
  it('builds the read-only document for the listing coordinates', async () => {
    await render(
      <ListingLocationMap lat={14.9548} lng={120.8969} locationLabel="Baliuag" />
    )

    expect(mockWebViewProps.current?.source.html).toContain(
      'setView([14.9548, 120.8969], 15)'
    )
    expect(mockWebViewProps.current?.source.html).toContain('dragging: false')
  })

  it('renders nothing without finite coordinates', async () => {
    const screen = await render(
      <ListingLocationMap lat={Number.NaN} lng={120.8969} locationLabel="Baliuag" />
    )

    expect(screen.toJSON()).toBeNull()
    expect(mockWebViewProps.current).toBeNull()
  })

  it('shows a labeled fallback when the map errors', async () => {
    const screen = await render(
      <ListingLocationMap lat={14.9548} lng={120.8969} locationLabel="Baliuag" />
    )

    await act(() => {
      mockWebViewProps.current?.onError?.()
    })

    expect(screen.getByText('Map unavailable.')).toBeTruthy()
  })

  it('falls back when the document never signals ready', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] })
    const screen = await render(
      <ListingLocationMap lat={14.9548} lng={120.8969} locationLabel="Baliuag" />
    )

    await act(() => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 100)
    })

    expect(screen.getByText('Map unavailable.')).toBeTruthy()
  })

  it('treats a ready handshake as a successful load and cancels the timeout', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask'] })
    const screen = await render(
      <ListingLocationMap lat={14.9548} lng={120.8969} locationLabel="Baliuag" />
    )

    await act(() => {
      postBridgeMessage({ type: 'ready' })
    })
    await act(() => {
      jest.advanceTimersByTime(MAP_LOAD_TIMEOUT_MS + 100)
    })

    expect(screen.queryByText('Map unavailable.')).toBeNull()
  })

  it('opens external navigations outside the webview', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)
    await render(
      <ListingLocationMap lat={14.9548} lng={120.8969} locationLabel="Baliuag" />
    )

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
