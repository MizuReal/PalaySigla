// Marketplace filter toolbar — the DESIGN.md marketplace-filters treatment
// on a surface-soft band: a search field (search-input height) always
// visible, beside an inline Filters chip that expands/collapses the rest of
// the toolbar (category pill-tabs in a horizontal scroll row + the three-way
// sort segmented control). Collapsed by default; a primary dot on the chip
// signals a non-default category or sort is applied while the region is
// closed. Fully controlled — the screen owns the debounced search state, and
// the open/closed state is purely presentational.
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Icon from '../Icon.jsx'
import { LISTING_CATEGORIES, LISTING_SORTS } from '../../services/listings.js'
import { CATEGORY_LABELS } from '../../utils/format.js'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../../theme/designTokens.js'

const SEARCH_INPUT_HEIGHT = 40
const TOGGLE_ICON_SIZE = 16
const ACTIVE_FILTER_DOT_SIZE = 6
// 40px visual height matches the search field; the 2px vertical hit slop
// restores the >= 44px WCAG AA tap target (DESIGN.md touch rule)
const TOGGLE_HIT_SLOP = { top: 2, bottom: 2 }

const SORT_OPTIONS = Object.freeze([
  { value: LISTING_SORTS.NEWEST, label: 'Newest' },
  { value: LISTING_SORTS.PRICE_ASC, label: 'Lowest price' },
  { value: LISTING_SORTS.PRICE_DESC, label: 'Highest price' },
])

function pillStyle(isActive, extra = null) {
  const active = { borderColor: COLORS.ink, backgroundColor: COLORS.ink }
  const inactive = { borderColor: COLORS.hairline, backgroundColor: COLORS.canvas }
  return [styles.pill, isActive ? active : inactive, extra]
}

function FilterPill({ label, isActive, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={({ pressed }) => [
        pillStyle(isActive),
        pressed && !isActive && { borderColor: COLORS.primary },
      ]}
    >
      <Text style={[TYPE.buttonSm, isActive ? styles.pillTextActive : styles.pillText]}>
        {label}
      </Text>
    </Pressable>
  )
}

function FilterToggle({ isExpanded, hasActiveFilter, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isExpanded ? 'Hide filters' : 'Show filters'}
      accessibilityState={{ expanded: isExpanded }}
      hitSlop={TOGGLE_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterToggle,
        pressed && styles.filterTogglePressed,
      ]}
    >
      <Text style={[TYPE.buttonSm, styles.filterToggleLabel]}>Filters</Text>
      {hasActiveFilter ? (
        <View style={styles.activeFilterDot} accessible={false} />
      ) : null}
      <Icon
        name={isExpanded ? 'chevron-up' : 'chevron-down'}
        size={TOGGLE_ICON_SIZE}
        color={COLORS.ink}
      />
    </Pressable>
  )
}

function ListingFilters({
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilter = category !== null || sort !== LISTING_SORTS.NEWEST

  return (
    <View
      style={[
        styles.toolbar,
        isExpanded ? styles.toolbarExpanded : styles.toolbarCollapsed,
      ]}
    >
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={onSearchChange}
          placeholder="Search by title or location…"
          placeholderTextColor={COLORS.stone}
          accessibilityLabel="Search listings"
          autoCorrect={false}
          returnKeyType="search"
        />
        <FilterToggle
          isExpanded={isExpanded}
          hasActiveFilter={hasActiveFilter}
          onPress={() => setIsExpanded((current) => !current)}
        />
      </View>
      {isExpanded ? (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.pillScroller}
            contentContainerStyle={styles.pillRow}
          >
            <FilterPill
              label="All"
              isActive={category === null}
              onPress={() => onCategoryChange(null)}
            />
            {LISTING_CATEGORIES.map((categoryKey) => (
              <FilterPill
                key={categoryKey}
                label={CATEGORY_LABELS[categoryKey]}
                isActive={category === categoryKey}
                onPress={() => onCategoryChange(categoryKey)}
              />
            ))}
          </ScrollView>
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === option.value }}
                onPress={() => onSortChange(option.value)}
                style={({ pressed }) => [
                  pillStyle(sort === option.value, styles.sortPill),
                  pressed && sort !== option.value && { borderColor: COLORS.primary },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[TYPE.buttonSm, sort === option.value ? styles.pillTextActive : styles.pillText]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
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
  },
  toolbarCollapsed: {
    paddingBottom: SPACING.md,
  },
  toolbarExpanded: {
    paddingBottom: SPACING.lg,
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
  filterToggle: {
    height: SEARCH_INPUT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
  },
  filterTogglePressed: {
    borderColor: COLORS.primary,
  },
  filterToggleLabel: {
    color: COLORS.ink,
  },
  activeFilterDot: {
    width: ACTIVE_FILTER_DOT_SIZE,
    height: ACTIVE_FILTER_DOT_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  pillScroller: {
    marginTop: SPACING.sm,
    flexGrow: 0,
  },
  pillRow: {
    paddingHorizontal: GUTTER,
    gap: SPACING.sm,
  },
  sortRow: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
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
  sortPill: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  pillText: {
    color: COLORS.ink,
  },
  pillTextActive: {
    color: COLORS.onDark,
  },
})

export default ListingFilters
