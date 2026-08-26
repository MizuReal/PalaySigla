import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import Icon from '../Icon.jsx'
import { reverseGeocode, searchPlace } from '../../services/geocode.js'

const PHILIPPINES_CENTER = [12.8797, 121.774]
const DEFAULT_ZOOM = 6
const PICK_ZOOM = 15
const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const pinIcon = L.divIcon({
  className: '',
  html: `<svg viewBox="0 0 24 24" width="32" height="42" aria-hidden="true">
    <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"
      fill="var(--color-primary)" stroke="var(--color-primary-dark)" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 40],
})

function FlyToPosition({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) {
      map.flyTo(position, PICK_ZOOM)
    }
  }, [map, position])
  return null
}

function ClickToPosition({ onPositionChange }) {
  useMapEvents({
    click: (event) => {
      onPositionChange([event.latlng.lat, event.latlng.lng])
    },
  })
  return null
}

function MapPicker({ position, onPositionChange, onLocationLabel }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isLabelLoading, setIsLabelLoading] = useState(false)
  const reverseRequestRef = useRef(0)

  const handlePositionChange = (nextPosition) => {
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

  const handleSearchSubmit = async (event) => {
    event.preventDefault()
    const query = searchQuery.trim()
    if (query.length < 2) {
      return
    }
    setIsSearching(true)
    setSearchError('')
    try {
      const results = await searchPlace(query, 5)
      setSearchResults(results)
      if (results.length === 0) {
        setSearchError('No places found. Try a nearby town or barangay.')
      }
    } catch (err) {
      setSearchError(err.message)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleResultPick = (result) => {
    setSearchResults([])
    setSearchQuery('')
    handlePositionChange([result.lat, result.lng])
  }

  return (
    <div>
      <form onSubmit={handleSearchSubmit} className="flex gap-2" noValidate>
        <label htmlFor="location-search" className="sr-only">
          Search for a place
        </label>
        <input
          id="location-search"
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search for a town or barangay…"
          className="h-11 flex-1 border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]"
        />
        <button
          type="submit"
          disabled={isSearching}
          className="h-11 border border-hairline bg-canvas px-5 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
        >
          {isSearching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searchResults.length > 0 && (
        <ul className="mt-2 border border-hairline bg-canvas">
          {searchResults.map((result) => (
            <li key={result.place_id}>
              <button
                type="button"
                onClick={() => handleResultPick(result)}
                className="flex w-full items-start gap-2 border-b border-hairline px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-soft"
              >
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="body-sm text-ink">{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {searchError}
        </p>
      )}

      <div className="relative z-0 mt-3 h-[360px] w-full border border-hairline">
        <MapContainer
          center={PHILIPPINES_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
          <ClickToPosition onPositionChange={handlePositionChange} />
          {position && (
            <Marker
              position={position}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const latlng = event.target.getLatLng()
                  handlePositionChange([latlng.lat, latlng.lng])
                },
              }}
            />
          )}
          <FlyToPosition position={position} />
        </MapContainer>
      </div>

      {isLabelLoading ? (
        <p className="caption-sm mt-2 text-mute">Finding the address…</p>
      ) : (
        position && (
          <p className="caption-sm mt-2 text-mute" role="status">
            Location set — adjust the pin or click anywhere else on the map.
          </p>
        )
      )}
    </div>
  )
}

export default MapPicker
