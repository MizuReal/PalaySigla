// Community toolbar — the pinned chrome above the feed: a search field with a
// 44px primary "start a discussion" square (the `plus` glyph), and the All +
// seven category chips with their counts. It replaces the former hero band and
// category grid so the feed owns the viewport; a failed count offers an inline
// retry rather than a silent zero.
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Icon from '../Icon'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import type { ForumCategory } from '../../utils/forumCategories'
import type { ForumCategoryCounts } from '../../services/forum'
import {
  COLORS,
  GUTTER,
  RADIUS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const SEARCH_INPUT_HEIGHT = 40
const CREATE_ICON_SIZE = 22

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
  const renderPill = (key: 'all' | ForumCategory, label: string, count?: number) => {
    const isActive = key === 'all' ? category === null : category === key
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={
          count === undefined ? label : `${label}, ${count} discussions`
        }
        onPress={() => onCategoryChange(key === 'all' ? null : key)}
        style={({ pressed }) => [
          styles.pill,
          isActive ? styles.pillActive : styles.pillInactive,
          pressed && !isActive && styles.pillPressed,
        ]}
      >
        <Text
          style={[TYPE.buttonSm, isActive ? styles.pillTextActive : styles.pillText]}
        >
          {label}
          {count !== undefined ? ` · ${count}` : ''}
        </Text>
      </Pressable>
    )
  }

  return (
    <View style={styles.toolbar}>
      <View style={styles.searchRow}>
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.pillScroller}
        contentContainerStyle={styles.pillRow}
      >
        {renderPill('all', 'All')}
        {FORUM_CATEGORIES.map((forumCategory) =>
          renderPill(
            forumCategory,
            FORUM_CATEGORY_LABELS[forumCategory],
            counts ? counts[forumCategory] : undefined
          )
        )}
      </ScrollView>

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
      ) : null}
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
  searchInput: {
    flex: 1,
    height: SEARCH_INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
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
  pillScroller: {
    marginTop: SPACING.sm,
    flexGrow: 0,
  },
  pillRow: {
    paddingHorizontal: GUTTER,
    gap: SPACING.sm,
  },
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  pillInactive: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  pillActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  pillPressed: {
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.ink,
  },
  pillTextActive: {
    color: COLORS.onDark,
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
