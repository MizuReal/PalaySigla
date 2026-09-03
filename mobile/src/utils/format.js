// Listing label maps and time/price formatters shared by the feed and the
// detail screen — mirrored from website/src/utils/format.js.
const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

export const CATEGORY_LABELS = Object.freeze({
  palay: 'Palay',
  rice: 'Rice',
  seeds: 'Seeds',
  machinery: 'Machinery',
  other: 'Other',
})

export const UNIT_LABELS = Object.freeze({
  kg: 'per kg',
  sack: 'per sack',
  cavan: 'per cavan',
  lot: 'per lot',
})

const priceFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export function formatPrice(price) {
  return priceFormatter.format(price)
}

export function formatRelativeTime(isoTimestamp) {
  const elapsedMs = Date.now() - new Date(isoTimestamp).getTime()
  if (elapsedMs < MINUTE_MS) {
    return 'just now'
  }
  const minutes = Math.floor(elapsedMs / MINUTE_MS)
  if (minutes < 60) {
    return `${minutes}m ago`
  }
  const hours = Math.floor(elapsedMs / HOUR_MS)
  if (hours < 24) {
    return `${hours}h ago`
  }
  const days = Math.floor(elapsedMs / DAY_MS)
  if (days < 7) {
    return `${days}d ago`
  }
  return new Date(isoTimestamp).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
