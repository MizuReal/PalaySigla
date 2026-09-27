import type { IconName } from '../components/Icon'
import type { ForumCategory } from '../services/forum'

// One glyph per forum category so the filter chips and post tags read at a
// glance without relying on label text alone.
export const FORUM_CATEGORY_ICONS: Record<ForumCategory, IconName> = Object.freeze({
  general: 'chat',
  planting: 'sprout',
  pests: 'bug',
  harvesting: 'basket',
  storage: 'drop',
  quality: 'quality',
  market: 'scale',
})

// Per-category tag colors: a pale fill with a saturated accent on the glyph
// and border. The class strings are written out in full so Tailwind's JIT
// emits them even though they are selected at runtime.
export interface ForumCategoryTagClasses {
  fill: string
  accentText: string
  accentBorder: string
}

export const FORUM_CATEGORY_TAG_CLASSES: Record<
  ForumCategory,
  ForumCategoryTagClasses
> = Object.freeze({
  general: {
    fill: 'bg-surface-soft',
    accentText: 'text-mute',
    accentBorder: 'border-mute',
  },
  planting: {
    fill: 'bg-accent-leaf-pale',
    accentText: 'text-success-deep',
    accentBorder: 'border-success-deep',
  },
  pests: {
    fill: 'bg-accent-rust-pale',
    accentText: 'text-accent-rust',
    accentBorder: 'border-accent-rust',
  },
  harvesting: {
    fill: 'bg-accent-yellow-pale',
    accentText: 'text-warning-bright',
    accentBorder: 'border-warning-bright',
  },
  storage: {
    fill: 'bg-accent-blue-pale',
    accentText: 'text-accent-blue',
    accentBorder: 'border-accent-blue',
  },
  quality: {
    fill: 'bg-accent-purple-pale',
    accentText: 'text-accent-purple',
    accentBorder: 'border-accent-purple',
  },
  market: {
    fill: 'bg-accent-teal-pale',
    accentText: 'text-accent-teal',
    accentBorder: 'border-accent-teal',
  },
})
