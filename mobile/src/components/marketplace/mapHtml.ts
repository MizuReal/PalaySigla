// Leaflet document rendered inside the picker's react-native-webview. The
// map is a thin bridge: clicks and pin drags post `{type: 'pick', lat, lng}`
// to React Native, the native side owns search and reverse geocoding, and
// `setMarker` is injected back to move the pin. Only finite coordinates are
// interpolated, so no user-supplied text ever reaches the HTML.
import { COLORS } from '../../theme/designTokens'
import {
  DEFAULT_ZOOM,
  LEAFLET_SCRIPT_URL,
  LEAFLET_STYLESHEET_URL,
  MAP_ATTRIBUTION,
  MAP_TILE_URL,
  PHILIPPINES_CENTER,
  PICK_ZOOM,
  PIN_ICON_ANCHOR,
  PIN_ICON_DOT,
  PIN_ICON_FILL,
  PIN_ICON_HEIGHT,
  PIN_ICON_STROKE,
  PIN_ICON_WIDTH,
  type MapPosition,
} from './mapConfig'

export interface MapHtmlOptions {
  position: MapPosition | null
}

function formatCoordinate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError('Map coordinates must be finite numbers.')
  }
  return String(value)
}

function formatPosition(position: MapPosition): string {
  return `${formatCoordinate(position[0])}, ${formatCoordinate(position[1])}`
}

// Injected whenever the selected position changes; the trailing `true;`
// prevents iOS from warning about the evaluation result.
export function buildSetMarkerScript(position: MapPosition, flyTo: boolean): string {
  return `window.setMarker && window.setMarker(${formatPosition(position)}, ${flyTo}); true;`
}

export function buildMapHtml({ position }: MapHtmlOptions): string {
  const initialCenter = formatPosition(position ?? PHILIPPINES_CENTER)
  const initialZoom = position ? PICK_ZOOM : DEFAULT_ZOOM
  const initialMarker = position ? `setMarker(${formatPosition(position)}, false);` : ''

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link rel="stylesheet" href="${LEAFLET_STYLESHEET_URL}" />
    <style>
      html, body, #map { height: 100%; margin: 0; }
      body { background: ${COLORS.surfaceSoft}; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="${LEAFLET_SCRIPT_URL}"></script>
    <script>
      (function () {
        var PIN_ICON = L.divIcon({
          className: '',
          html: '<svg viewBox="0 0 24 24" width="${PIN_ICON_WIDTH}" height="${PIN_ICON_HEIGHT}" aria-hidden="true"><path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" fill="${PIN_ICON_FILL}" stroke="${PIN_ICON_STROKE}" stroke-width="1.5"/><circle cx="12" cy="10" r="2.5" fill="${PIN_ICON_DOT}" stroke="none"/></svg>',
          iconSize: [${PIN_ICON_WIDTH}, ${PIN_ICON_HEIGHT}],
          iconAnchor: [${PIN_ICON_ANCHOR[0]}, ${PIN_ICON_ANCHOR[1]}]
        });
        var map = L.map('map').setView([${initialCenter}], ${initialZoom});
        L.tileLayer('${MAP_TILE_URL}', { attribution: '${MAP_ATTRIBUTION}' }).addTo(map);
        var marker = null;
        function postMessage(payload) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(payload));
          }
        }
        function setMarker(lat, lng, flyTo) {
          if (marker) {
            marker.setLatLng([lat, lng]);
          } else {
            marker = L.marker([lat, lng], { icon: PIN_ICON, draggable: true }).addTo(map);
            marker.on('dragend', function () {
              var latlng = marker.getLatLng();
              postMessage({ type: 'pick', lat: latlng.lat, lng: latlng.lng });
            });
          }
          if (flyTo) {
            map.flyTo([lat, lng], ${PICK_ZOOM});
          }
        }
        window.setMarker = setMarker;
        map.on('click', function (event) {
          setMarker(event.latlng.lat, event.latlng.lng, false);
          postMessage({ type: 'pick', lat: event.latlng.lat, lng: event.latlng.lng });
        });
        ${initialMarker}
        postMessage({ type: 'ready' });
      })();
    </script>
  </body>
</html>`
}
