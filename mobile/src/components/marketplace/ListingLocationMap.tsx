// Read-only map for the listing detail screen — the web ListingLocationMap
// ported to the phone: a static Leaflet frame (dragging disabled so it never
// fights the screen scroll, pinch-zoom kept) with the listing pin and the
// mandatory OSM attribution. The document is built once from the finite
// coordinates, so the WebView never reloads. Leaflet loads from a CDN, so a
// missing ready handshake within five seconds (or a WebView error) falls back
// to a labeled placeholder instead of a silent blank frame.
import { useEffect, useRef, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview'
import Icon from '../Icon'
import { MAP_VIEW_HEIGHT } from './mapConfig'
import { buildMapViewHtml } from './mapHtml'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

// Leaflet assets come from unpkg; without a ready signal the map is treated as
// failed so the frame never shows a silent blank.
const MAP_LOAD_TIMEOUT_MS = 5000
const BRIDGE_READY = 'ready'

interface MapBridgeMessage {
  type: string
}

interface ListingLocationMapProps {
  lat: number
  lng: number
  locationLabel: string
}

function ListingLocationMap({ lat, lng, locationLabel }: ListingLocationMapProps) {
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng)
  const [hasError, setHasError] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapSource] = useState(() =>
    hasCoordinates ? { html: buildMapViewHtml({ lat, lng }) } : null
  )
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!mapSource || isMapReady || hasError) {
      return undefined
    }
    timeoutRef.current = setTimeout(() => setHasError(true), MAP_LOAD_TIMEOUT_MS)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [mapSource, isMapReady, hasError])

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch {
      // attribution links are informational; the pin and label stay on screen
    }
  }

  const handleShouldStartLoad = (request: WebViewNavigation): boolean => {
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
      openExternalLink(request.url)
      return false
    }
    return true
  }

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as MapBridgeMessage
      if (payload.type === BRIDGE_READY) {
        setIsMapReady(true)
      }
    } catch {
      // malformed bridge payloads are ignored; the ready timeout still guards
    }
  }

  if (!hasCoordinates || mapSource === null) {
    return null
  }

  if (hasError) {
    return (
      <View
        style={[styles.frame, styles.fallback]}
        accessible
        accessibilityLabel={`Map unavailable for ${locationLabel}`}
      >
        <Icon name="pin" size={20} color={COLORS.stone} />
        <Text style={[TYPE.captionSm, styles.fallbackText]}>Map unavailable.</Text>
      </View>
    )
  }

  return (
    <View style={styles.frame}>
      <WebView
        source={mapSource}
        originWhitelist={['*']}
        onMessage={handleMapMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onError={() => setHasError(true)}
        scrollEnabled={false}
        style={styles.webview}
        accessible
        accessibilityLabel={`Map showing the location of ${locationLabel}`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    height: MAP_VIEW_HEIGHT,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSoft,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.surfaceSoft,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  fallbackText: {
    color: COLORS.mute,
  },
})

export default ListingLocationMap
