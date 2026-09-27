import type { IconName } from '../components/Icon'
import type { ListingCategory } from '../services/listings'

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
// and border. The class strings are written out in full so Tailwind's JIT
// emits them even though they are selected at runtime.
export interface CategoryTagClasses {
  fill: string
  accentText: string
  accentBorder: string
}

export const CATEGORY_TAG_CLASSES: Record<ListingCategory, CategoryTagClasses> =
  Object.freeze({
    palay: {
      fill: 'bg-accent-yellow-pale',
      accentText: 'text-warning-bright',
      accentBorder: 'border-warning-bright',
    },
    rice: {
      fill: 'bg-accent-teal-pale',
      accentText: 'text-accent-teal',
      accentBorder: 'border-accent-teal',
    },
    seeds: {
      fill: 'bg-accent-purple-pale',
      accentText: 'text-accent-purple',
      accentBorder: 'border-accent-purple',
    },
    machinery: {
      fill: 'bg-accent-blue-pale',
      accentText: 'text-accent-blue',
      accentBorder: 'border-accent-blue',
    },
    other: {
      fill: 'bg-surface-soft',
      accentText: 'text-mute',
      accentBorder: 'border-mute',
    },
  })

// Replaces the former two-sentence marketplace hero paragraph with the four
// things the feed actually sells.
export const MARKETPLACE_TAGLINE = 'Palay · Rice · Seeds · Machinery'
