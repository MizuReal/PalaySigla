// Map constants for the marketplace location surfaces — a direct port of
// website/src/components/marketplace/mapConfig.ts. Tiles, attribution, and
// Leaflet CDN assets follow AGENTS.md (OpenStreetMap tiles + mandatory
// attribution, Leaflet 1.9.4 from unpkg). Pin colors come from the design
// tokens so the marker stays on-brand on every map surface.
import { COLORS } from '../../theme/designTokens'

export type MapPosition = [number, number]

export const PHILIPPINES_CENTER: MapPosition = [12.8797, 121.774]
export const DEFAULT_ZOOM = 6
export const PICK_ZOOM = 15
export const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const LEAFLET_STYLESHEET_URL =
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
export const LEAFLET_SCRIPT_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'

// Picker map height on phones; DESIGN.md documents this surface under the
// Mobile (React Native) Implementation Notes.
export const MAP_HEIGHT = 320

export const PIN_ICON_WIDTH = 32
export const PIN_ICON_HEIGHT = 42
export const PIN_ICON_ANCHOR: MapPosition = [16, 40]
export const PIN_ICON_FILL = COLORS.primary
export const PIN_ICON_STROKE = COLORS.primaryDark
export const PIN_ICON_DOT = COLORS.canvas

const OSM_VIEW_URL = 'https://www.openstreetmap.org/'

export function buildOpenStreetMapUrl(lat: number, lng: number): string {
  return `${OSM_VIEW_URL}?mlat=${lat}&mlon=${lng}#map=${PICK_ZOOM}/${lat}/${lng}`
}
