/// <reference types="jest" />
import { COLORS } from '../../../theme/designTokens'
import {
  DEFAULT_ZOOM,
  LEAFLET_SCRIPT_URL,
  LEAFLET_STYLESHEET_URL,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  PHILIPPINES_CENTER,
  PICK_ZOOM,
} from '../mapConfig'
import { buildMapHtml, buildMapViewHtml, buildSetMarkerScript } from '../mapHtml'

const PICKED: [number, number] = [14.9548, 120.8969]

describe('buildMapHtml', () => {
  it('loads Leaflet from the pinned unpkg CDN with OSM tiles and attribution', () => {
    const html = buildMapHtml({ position: null })

    expect(html).toContain(LEAFLET_STYLESHEET_URL)
    expect(html).toContain(LEAFLET_SCRIPT_URL)
    expect(html).toContain(MAP_TILE_URL)
    expect(html).toContain(MAP_ATTRIBUTION)
  })

  it('centers on the Philippines at the default zoom with no position', () => {
    const html = buildMapHtml({ position: null })

    expect(html).toContain(
      `setView([${PHILIPPINES_CENTER[0]}, ${PHILIPPINES_CENTER[1]}], ${DEFAULT_ZOOM})`
    )
    // no initial marker call; the only other setMarker references are the
    // function definition, the click handler, and the window assignment
    expect(html).not.toMatch(/setMarker\(\d/)
  })

  it('starts on the provided position at the pick zoom with the pin placed', () => {
    const html = buildMapHtml({ position: PICKED })

    expect(html).toContain(`setView([14.9548, 120.8969], ${PICK_ZOOM})`)
    expect(html).toContain('setMarker(14.9548, 120.8969, false);')
  })

  it('wires the pin geometry, bridge messages, and tile attribution', () => {
    const html = buildMapHtml({ position: null })

    expect(html).toContain(`fill="${COLORS.primary}"`)
    expect(html).toContain(`stroke="${COLORS.primaryDark}"`)
    expect(html).toContain("marker.on('dragend'")
    expect(html).toContain("postMessage({ type: 'ready' })")
    expect(html).toContain(
      "postMessage({ type: 'pick', lat: event.latlng.lat, lng: event.latlng.lng })"
    )
    expect(html).toContain('window.setMarker = setMarker')
  })

  it('rejects non-finite coordinates', () => {
    expect(() => buildMapHtml({ position: [Number.NaN, 120] })).toThrow(RangeError)
    expect(() =>
      buildMapHtml({ position: [14, Number.POSITIVE_INFINITY] })
    ).toThrow(RangeError)
  })
})

describe('buildSetMarkerScript', () => {
  it('formats the injected command for the bridge', () => {
    expect(buildSetMarkerScript(PICKED, true)).toBe(
      'window.setMarker && window.setMarker(14.9548, 120.8969, true); true;'
    )
  })

  it('rejects non-finite coordinates', () => {
    expect(() => buildSetMarkerScript([Number.NaN, 120], false)).toThrow(RangeError)
  })
})

describe('buildMapViewHtml', () => {
  it('centers on the listing with the same tiles, attribution, and pin', () => {
    const html = buildMapViewHtml({ lat: 14.9548, lng: 120.8969 })

    expect(html).toContain(LEAFLET_STYLESHEET_URL)
    expect(html).toContain(LEAFLET_SCRIPT_URL)
    expect(html).toContain(MAP_TILE_URL)
    expect(html).toContain(MAP_ATTRIBUTION)
    expect(html).toContain(`setView([14.9548, 120.8969], ${PICK_ZOOM})`)
    expect(html).toContain(`fill="${COLORS.primary}"`)
    expect(html).toContain('L.marker([14.9548, 120.8969]')
  })

  it('signals ready and never installs the picker bridge', () => {
    const html = buildMapViewHtml({ lat: 14.9548, lng: 120.8969 })

    expect(html).toContain('dragging: false')
    expect(html).toContain('scrollWheelZoom: false')
    expect(html).toContain("postMessage({ type: 'ready' })")
    expect(html).not.toContain("type: 'pick'")
    expect(html).not.toContain('window.setMarker')
    expect(html).not.toContain("map.on('click'")
  })

  it('rejects non-finite coordinates', () => {
    expect(() => buildMapViewHtml({ lat: Number.NaN, lng: 120 })).toThrow(RangeError)
    expect(() => buildMapViewHtml({ lat: 14, lng: Number.POSITIVE_INFINITY })).toThrow(
      RangeError
    )
  })
})
