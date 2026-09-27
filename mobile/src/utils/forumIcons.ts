import type { IconName } from '../components/Icon'
import type { ForumCategory } from './forumCategories'
import { COLORS } from '../theme/designTokens'

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
// and border.
export interface ForumCategoryTagColors {
  fill: string
  accent: string
}

export const FORUM_CATEGORY_TAG_COLORS: Record<
  ForumCategory,
  ForumCategoryTagColors
> = Object.freeze({
  general: { fill: COLORS.surfaceSoft, accent: COLORS.mute },
  planting: { fill: COLORS.accentLeafPale, accent: COLORS.successDeep },
  pests: { fill: COLORS.accentRustPale, accent: COLORS.accentRust },
  harvesting: { fill: COLORS.accentYellowPale, accent: COLORS.warningBright },
  storage: { fill: COLORS.accentBluePale, accent: COLORS.accentBlue },
  quality: { fill: COLORS.accentPurplePale, accent: COLORS.accentPurple },
  market: { fill: COLORS.accentTealPale, accent: COLORS.accentTeal },
})
