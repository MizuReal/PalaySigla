import type { IconName } from '../components/Icon'
import type { ListingCategory } from '../services/listings'
import { COLORS } from '../theme/designTokens'

// One glyph per marketplace category keeps the filter chips and the listing
// cards readable at a glance without relying on label text alone.
export const CATEGORY_ICONS: Record<ListingCategory, IconName> = Object.freeze({
  palay: 'sprout',
  rice: 'grain',
  seeds: 'seed',
  machinery: 'tractor',
  other: 'basket',
})

// Per-category tag colors: a pale fill with a saturated accent on the glyph
// and border.
export interface CategoryTagColors {
  fill: string
  accent: string
}

export const CATEGORY_TAG_COLORS: Record<ListingCategory, CategoryTagColors> =
  Object.freeze({
    palay: { fill: COLORS.accentYellowPale, accent: COLORS.warningBright },
    rice: { fill: COLORS.accentTealPale, accent: COLORS.accentTeal },
    seeds: { fill: COLORS.accentPurplePale, accent: COLORS.accentPurple },
    machinery: { fill: COLORS.accentBluePale, accent: COLORS.accentBlue },
    other: { fill: COLORS.surfaceSoft, accent: COLORS.mute },
  })

// Replaces the former two-sentence marketplace hero paragraph with the four
// things the feed actually sells.
export const MARKETPLACE_TAGLINE = 'Palay · Rice · Seeds · Machinery'
