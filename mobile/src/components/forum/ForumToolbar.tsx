// Community toolbar — the pinned chrome above the feed: a search field with a
// leading `search` glyph and clear affordance beside a 44px primary "start a
// discussion" square (the `plus` glyph), then a category dropdown showing
// every option with its glyph and count. A caption beneath names the active
// category; a failed count offers an inline retry rather than a silent zero.
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import CategoryMenu from '../CategoryMenu'
import type { CategoryMenuOption } from '../CategoryMenu'
import Icon from '../Icon'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_DESCRIPTIONS,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import type { ForumCategory } from '../../utils/forumCategories'
import {
  FORUM_CATEGORY_ICONS,
  FORUM_CATEGORY_TAG_COLORS,
} from '../../utils/forumIcons'
import type { ForumCategoryCounts } from '../../services/forum'
import {
  COLORS,
  GUTTER,
  RADIUS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const ALL_CATEGORY_ID = 'all'
const SEARCH_INPUT_HEIGHT = 40
const CREATE_ICON_SIZE = 22
const CHIP_ICON_SIZE = 16
const CLEAR_ICON_SIZE = 16
const CLEAR_BUTTON_SIZE = 32

const ALL_CATEGORY_DESCRIPTION =
  'Browse every topic, or pick one to narrow the feed.'

interface ForumToolbarProps {
  category: ForumCategory | null
  counts: ForumCategoryCounts | null
  countsError: string
  search: string
  onCategoryChange: (category: ForumCategory | null) => void
  onSearchChange: (search: string) => void
  onRetryCounts: () => void
  onStartDiscussion: () => void
}

function ForumToolbar({
  category,
  counts,
  countsError,
  search,
  onCategoryChange,
  onSearchChange,
  onRetryCounts,
  onStartDiscussion,
}: ForumToolbarProps) {
  const description = category
    ? FORUM_CATEGORY_DESCRIPTIONS[category]
    : ALL_CATEGORY_DESCRIPTION

  const categoryOptions: CategoryMenuOption[] = [
    { id: ALL_CATEGORY_ID, label: 'All categories' },
    ...FORUM_CATEGORIES.map((forumCategory) => ({
      id: forumCategory,
      label: FORUM_CATEGORY_LABELS[forumCategory],
      icon: FORUM_CATEGORY_ICONS[forumCategory],
      accent: FORUM_CATEGORY_TAG_COLORS[forumCategory].accent,
      count: counts ? counts[forumCategory] : undefined,
    })),
  ]

  const handleCategoryChange = (id: string) => {
    onCategoryChange(id === ALL_CATEGORY_ID ? null : (id as ForumCategory))
  }

  return (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Icon name="search" size={CHIP_ICON_SIZE} color={COLORS.mute} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search discussions…"
            placeholderTextColor={COLORS.stone}
            accessibilityLabel="Search discussions"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={SPACING.sm}
              onPress={() => onSearchChange('')}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="close" size={CLEAR_ICON_SIZE} color={COLORS.mute} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a discussion"
          onPress={onStartDiscussion}
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
        >
          <Icon name="plus" size={CREATE_ICON_SIZE} color={COLORS.onPrimary} />
        </Pressable>
      </View>

      <CategoryMenu
        ariaLabel="Filter by category"
        value={category ?? ALL_CATEGORY_ID}
        options={categoryOptions}
        onChange={handleCategoryChange}
        style={styles.categoryMenu}
      />

      {countsError ? (
        <View style={styles.countsErrorRow}>
          <Text style={[TYPE.captionSm, styles.countsErrorText]}>
            Category counts unavailable.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetryCounts}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={[TYPE.captionSm, styles.retryText]}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[TYPE.captionSm, styles.description]}>{description}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: COLORS.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: GUTTER,
    gap: SPACING.sm,
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: SEARCH_INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingLeft: SPACING.md,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: SPACING.sm,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  clearButton: {
    width: CLEAR_BUTTON_SIZE,
    height: CLEAR_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  createButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
  },
  createButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  categoryMenu: {
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
  },
  description: {
    color: COLORS.mute,
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
  },
  countsErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
  },
  countsErrorText: {
    color: COLORS.error,
  },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  retryText: {
    color: COLORS.linkBlue,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ForumToolbar
