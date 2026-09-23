// "Browse by category" band — a collapsible 2-up grid of the seven category
// tiles (icon, label, discussion count, description). The active tile takes
// the primary border/title; counts come from the category-counts RPC and a
// failed count offers an inline retry rather than a silent zero.
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import type { IconName } from '../Icon'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_DESCRIPTIONS,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import type { ForumCategory } from '../../utils/forumCategories'
import type { ForumCategoryCounts } from '../../services/forum'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const CATEGORY_ICONS: Record<ForumCategory, IconName> = Object.freeze({
  general: 'chat',
  planting: 'sprout',
  pests: 'bug',
  harvesting: 'basket',
  storage: 'drop',
  quality: 'quality',
  market: 'scale',
})

const TILE_ICON_SIZE = 20

interface ForumCategorySectionProps {
  activeCategory: ForumCategory | null
  counts: ForumCategoryCounts | null
  isLoading: boolean
  error: string
  onSelect: (category: ForumCategory) => void
  onRetry: () => void
}

function ForumCategorySection({
  activeCategory,
  counts,
  isLoading,
  error,
  onSelect,
  onRetry,
}: ForumCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const summary = activeCategory
    ? `Showing ${FORUM_CATEGORY_LABELS[activeCategory]}`
    : 'Showing all discussions'

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={[TYPE.headingSm, styles.header]}>Browse by category</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={isExpanded ? 'Hide categories' : 'Show categories'}
          onPress={() => setIsExpanded((current) => !current)}
          style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
        >
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.onPrimary}
          />
        </Pressable>
      </View>
      {!isExpanded ? (
        <Text style={[TYPE.bodySm, styles.summary]}>{summary}</Text>
      ) : null}
      {isExpanded ? (
        <>
          {error ? (
            <View style={styles.errorRow}>
              <Text style={[TYPE.captionSm, styles.errorText]}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                hitSlop={SPACING.sm}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              >
                <Text style={[TYPE.captionSm, styles.retryText]}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.grid}>
            {FORUM_CATEGORIES.map((category) => {
              const isActive = activeCategory === category
              return (
                <Pressable
                  key={category}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={FORUM_CATEGORY_LABELS[category]}
                  onPress={() => onSelect(category)}
                  style={({ pressed }) => [
                    styles.tile,
                    isActive && styles.tileActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.tileIcon, isActive && styles.tileIconActive]}>
                    <Icon
                      name={CATEGORY_ICONS[category]}
                      size={TILE_ICON_SIZE}
                      color={isActive ? COLORS.onPrimary : COLORS.body}
                    />
                  </View>
                  <Text
                    style={[TYPE.cardTitle, isActive && styles.tileTitleActive]}
                  >
                    {FORUM_CATEGORY_LABELS[category]}
                  </Text>
                  <Text style={[TYPE.captionSm, styles.tileCount]}>
                    {isLoading || counts === null
                      ? '…'
                      : counts[category] === 1
                        ? '1 discussion'
                        : `${counts[category]} discussions`}
                  </Text>
                  <Text style={[TYPE.bodySm, styles.tileDescription]}>
                    {FORUM_CATEGORY_DESCRIPTIONS[category]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: GUTTER,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  header: {
    color: COLORS.ink,
  },
  toggle: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  summary: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
  },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  retryText: {
    color: COLORS.linkBlue,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  tileActive: {
    borderColor: COLORS.primary,
  },
  tileIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
  },
  tileIconActive: {
    backgroundColor: COLORS.primary,
  },
  tileTitleActive: {
    color: COLORS.primary,
  },
  tileCount: {
    color: COLORS.mute,
  },
  tileDescription: {
    color: COLORS.body,
  },
  spinner: {
    marginTop: SPACING.md,
  },
})

export default ForumCategorySection
