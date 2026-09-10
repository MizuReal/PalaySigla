import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import {
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  PICK_ZOOM,
  PIN_ICON,
} from './mapConfig.js'

const DEFAULT_HEIGHT_CLASS = 'h-[240px]'

function ListingLocationMap({ lat, lng, locationLabel, heightClass }) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }
  const position = [lat, lng]
  return (
    <div
      role="region"
      aria-label={`Map showing the location of ${locationLabel}`}
      className={`${heightClass ?? DEFAULT_HEIGHT_CLASS} w-full border border-hairline bg-surface-soft`}
    >
      <MapContainer
        center={position}
        zoom={PICK_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
        <Marker position={position} icon={PIN_ICON} alt={locationLabel} />
      </MapContainer>
    </div>
  )
}

export default ListingLocationMap
