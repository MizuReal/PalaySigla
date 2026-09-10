import * as L from 'leaflet'

export const PHILIPPINES_CENTER: [number, number] = [12.8797, 121.774]
export const DEFAULT_ZOOM = 6
export const PICK_ZOOM = 15
export const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

const OSM_VIEW_URL = 'https://www.openstreetmap.org/'

export const PIN_ICON = L.divIcon({
  className: '',
  html: `<svg viewBox="0 0 24 24" width="32" height="42" aria-hidden="true">
    <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"
      fill="var(--color-primary)" stroke="var(--color-primary-dark)" stroke-width="1.5"/>
    <circle cx="12" cy="10" r="2.5" fill="#ffffff" stroke="none"/>
  </svg>`,
  iconSize: [32, 42],
  iconAnchor: [16, 40],
})

export function buildOpenStreetMapUrl(lat: number, lng: number): string {
  return `${OSM_VIEW_URL}?mlat=${lat}&mlon=${lng}#map=${PICK_ZOOM}/${lat}/${lng}`
}
