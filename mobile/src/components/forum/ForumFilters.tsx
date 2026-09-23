// Community filter toolbar — the search field plus the All + seven category
// pill row (each with its discussion count), mirroring the marketplace filter
// treatment on a surface-soft band.
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import type { ForumCategory } from '../../utils/forumCategories'
import type { ForumCategoryCounts } from '../../services/forum'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const SEARCH_INPUT_HEIGHT = 40

interface ForumFiltersProps {
  category: ForumCategory | null
  counts: ForumCategoryCounts | null
  search: string
  onCategoryChange: (category: ForumCategory | null) => void
  onSearchChange: (search: string) => void
}

function ForumFilters({
  category,
  counts,
  search,
  onCategoryChange,
  onSearchChange,
}: ForumFiltersProps) {
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
  searchInput: {
    height: SEARCH_INPUT_HEIGHT,
    marginHorizontal: GUTTER,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
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
})

export default ForumFilters
