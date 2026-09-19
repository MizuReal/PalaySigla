// Location picker for the marketplace — the mobile equivalent of the web
// MapPicker. Search runs against the backend geocode proxy; the map itself is
// a react-native-webview rendering Leaflet with OpenStreetMap tiles
// (AGENTS.md: never a native map SDK, attribution always on). Fully
// controlled like the web component: the parent owns `position` and receives
// `onPositionChange` / `onLocationLabel`. The map document is built once and
// updated by injecting `setMarker`, so a position change never reloads the
// WebView.
import { useEffect, useRef, useState } from 'react'
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview'
import Icon from '../Icon'
import { reverseGeocode, searchPlace } from '../../services/geocode'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { GeocodeResult } from '../../types/api'
import { MAP_HEIGHT, type MapPosition } from './mapConfig'
import { buildMapHtml, buildSetMarkerScript } from './mapHtml'

// Backend query bounds (app/api/geocode.py)
const SEARCH_MIN_LENGTH = 2
const SEARCH_RESULT_LIMIT = 5
// Web search button padding (px-5) at the 44px search-input height
const SEARCH_BUTTON_PADDING = 20
const RESULT_ICON_SIZE = 16

const BRIDGE_READY = 'ready'
const BRIDGE_PICK = 'pick'

const SEARCH_FALLBACK_ERROR = 'Location service returned an error.'

const COPY = Object.freeze({
  searchPlaceholder: 'Search for a town or barangay…',
  search: 'Search',
  searching: 'Searching…',
  noResults: 'No places found. Try a nearby town or barangay.',
  findingAddress: 'Finding the address…',
  locationSet: 'Location set — drag the pin or tap the map to adjust.',
  mapLoadError: 'The map could not load. Check your connection.',
  retry: 'Reload map',
})

interface MapBridgeMessage {
  type: string
  lat?: number
  lng?: number
}

interface MapPickerProps {
  position: MapPosition | null
  onPositionChange: (position: MapPosition) => void
  onLocationLabel: (label: string) => void
}

function MapPicker({ position, onPositionChange, onLocationLabel }: MapPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLabelLoading, setIsLabelLoading] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)
  const [mapKey, setMapKey] = useState(0)
  // Built once so prop updates never swap `source` and reload the map; later
  // positions reach the map through injectJavaScript instead.
  const [mapSource] = useState(() => ({ html: buildMapHtml({ position }) }))

  const webViewRef = useRef<WebView>(null)
  const reverseRequestRef = useRef(0)

  useEffect(() => {
    if (!isMapReady || !position) {
      return
    }
    webViewRef.current?.injectJavaScript(buildSetMarkerScript(position, false))
  }, [isMapReady, position])

  const handlePositionChange = (nextPosition: MapPosition) => {
    onPositionChange(nextPosition)
    const requestId = ++reverseRequestRef.current
    setIsLabelLoading(true)
    onLocationLabel('')
    const loadLabel = async () => {
      try {
        const result = await reverseGeocode(nextPosition[0], nextPosition[1])
        if (requestId === reverseRequestRef.current) {
          onLocationLabel(result?.label ?? '')
        }
      } catch {
        if (requestId === reverseRequestRef.current) {
          onLocationLabel('')
        }
      } finally {
        if (requestId === reverseRequestRef.current) {
          setIsLabelLoading(false)
        }
      }
    }
    loadLabel()
  }

  const handleSearchSubmit = async () => {
    const query = searchQuery.trim()
    if (query.length < SEARCH_MIN_LENGTH) {
      return
    }
    setIsSearching(true)
    setSearchError('')
    try {
      const results = await searchPlace(query, SEARCH_RESULT_LIMIT)
      setSearchResults(results)
      if (results.length === 0) {
        setSearchError(COPY.noResults)
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : SEARCH_FALLBACK_ERROR
      )
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultPick = (result: GeocodeResult) => {
    const nextPosition: MapPosition = [result.lat, result.lng]
    setSearchResults([])
    setSearchQuery('')
    handlePositionChange(nextPosition)
    if (isMapReady) {
      webViewRef.current?.injectJavaScript(
        buildSetMarkerScript(nextPosition, true)
      )
    }
  }

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as MapBridgeMessage
      if (payload.type === BRIDGE_READY) {
        setIsMapReady(true)
        return
      }
      if (
        payload.type === BRIDGE_PICK &&
        typeof payload.lat === 'number' &&
        typeof payload.lng === 'number' &&
        Number.isFinite(payload.lat) &&
        Number.isFinite(payload.lng)
      ) {
        handlePositionChange([payload.lat, payload.lng])
      }
    } catch {
      // malformed bridge payloads are ignored; the map stays interactive
    }
  }

  const openAttributionLink = async (url: string) => {
    try {
      await Linking.openURL(url)
    } catch {
      // external navigation failure is non-fatal; the map stays usable
    }
  }

  const handleShouldStartLoad = (request: WebViewNavigation): boolean => {
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
      openAttributionLink(request.url)
      return false
    }
    return true
  }

  const handleMapRetry = () => {
    setIsMapReady(false)
    setMapError(false)
    setMapKey((current) => current + 1)
  }

  return (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, isSearchFocused && styles.searchInputFocused]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          onSubmitEditing={handleSearchSubmit}
          placeholder={COPY.searchPlaceholder}
          placeholderTextColor={COLORS.stone}
          accessibilityLabel="Search for a place"
          autoCorrect={false}
          returnKeyType="search"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSearching }}
          disabled={isSearching}
          onPress={handleSearchSubmit}
          style={({ pressed }) => [
            styles.searchButton,
            pressed && !isSearching && styles.searchButtonPressed,
          ]}
        >
          <Text
            style={[
              TYPE.buttonSm,
              isSearching ? styles.searchButtonLabelDisabled : styles.searchButtonLabel,
            ]}
          >
            {isSearching ? COPY.searching : COPY.search}
          </Text>
        </Pressable>
      </View>

      {searchResults.length > 0 ? (
        <View style={styles.results}>
          {searchResults.map((result, index) => (
            <Pressable
              key={result.place_id}
              accessibilityRole="button"
              accessibilityLabel={result.label}
              onPress={() => handleResultPick(result)}
              style={({ pressed }) => [
                styles.resultRow,
                index < searchResults.length - 1 && styles.resultRowDivider,
                pressed && styles.resultRowPressed,
              ]}
            >
              <View style={styles.resultIcon}>
                <Icon name="pin" size={RESULT_ICON_SIZE} color={COLORS.primary} />
              </View>
              <Text style={[TYPE.bodySm, styles.resultLabel]}>{result.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {searchError ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.errorText]}>
          {searchError}
        </Text>
      ) : null}

      <View style={styles.mapFrame}>
        {mapError ? (
          <View style={styles.mapErrorBlock}>
            <Text
              accessibilityRole="alert"
              style={[TYPE.captionSm, styles.mapErrorText]}
            >
              {COPY.mapLoadError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handleMapRetry}
              style={({ pressed }) => [
                styles.retryButton,
                pressed && styles.retryButtonPressed,
              ]}
            >
              <Text style={[TYPE.buttonSm, styles.retryLabel]}>{COPY.retry}</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={mapKey}
            ref={webViewRef}
            source={mapSource}
            originWhitelist={['*']}
            onMessage={handleMapMessage}
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onError={() => setMapError(true)}
            style={styles.webview}
            testID="map-picker-webview"
            accessible
            accessibilityLabel="Interactive map to pin the listing location"
          />
        )}
      </View>

      {isLabelLoading ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[TYPE.captionSm, styles.statusText]}
        >
          {COPY.findingAddress}
        </Text>
      ) : position ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[TYPE.captionSm, styles.statusText]}
        >
          {COPY.locationSet}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    height: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  searchInputFocused: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  searchButton: {
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SEARCH_BUTTON_PADDING,
  },
  searchButtonPressed: {
    borderColor: COLORS.primary,
  },
  searchButtonLabel: {
    color: COLORS.ink,
  },
  searchButtonLabelDisabled: {
    color: COLORS.ash,
  },
  results: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  resultRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  resultRowPressed: {
    backgroundColor: COLORS.surfaceSoft,
  },
  resultIcon: {
    marginTop: SPACING.xxs,
  },
  resultLabel: {
    flex: 1,
    color: COLORS.ink,
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  mapFrame: {
    height: MAP_HEIGHT,
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
  mapErrorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  mapErrorText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  retryButtonPressed: {
    borderColor: COLORS.primary,
  },
  retryLabel: {
    color: COLORS.ink,
  },
  statusText: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
})

export default MapPicker
