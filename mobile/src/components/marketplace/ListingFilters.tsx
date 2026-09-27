// Marketplace filter toolbar — the DESIGN.md marketplace-filters treatment on
// a surface-soft band: a search field (search-input height) always visible,
// beside an inline Filters chip that expands/collapses the rest of the toolbar
// (a category dropdown + the three-way sort segmented control). Collapsed by
// default; a primary dot on the chip signals a non-default category or sort is
// applied while the region is closed. Fully controlled — the screen owns the
// debounced search state, and the open/closed state is purely presentational.
import { useState } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import CategoryMenu from '../CategoryMenu'
import type { CategoryMenuOption } from '../CategoryMenu'
import Icon from '../Icon'
import { LISTING_CATEGORIES, LISTING_SORTS } from '../../services/listings'
import type { ListingCategory, ListingSort } from '../../services/listings'
import { CATEGORY_LABELS } from '../../utils/format'
import { CATEGORY_ICONS, CATEGORY_TAG_COLORS } from '../../utils/listingIcons'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const ALL_CATEGORY_ID = 'all'
const SEARCH_INPUT_HEIGHT = 40
const TOGGLE_ICON_SIZE = 16
const CLEAR_ICON_SIZE = 16
const CLEAR_BUTTON_SIZE = 32
const ACTIVE_FILTER_DOT_SIZE = 6
// 40px visual height matches the search field; the 2px vertical hit slop
// restores the >= 44px WCAG AA tap target (DESIGN.md touch rule)
const TOGGLE_HIT_SLOP = { top: 2, bottom: 2 }

const SORT_OPTIONS: readonly { value: ListingSort; label: string }[] =
  Object.freeze([
    { value: LISTING_SORTS.NEWEST, label: 'Newest' },
    { value: LISTING_SORTS.PRICE_ASC, label: 'Lowest price' },
    { value: LISTING_SORTS.PRICE_DESC, label: 'Highest price' },
  ])

function pillStyle(
  isActive: boolean,
  extra: StyleProp<ViewStyle> = null
): StyleProp<ViewStyle> {
  const active = { borderColor: COLORS.ink, backgroundColor: COLORS.ink }
  const inactive = { borderColor: COLORS.hairline, backgroundColor: COLORS.canvas }
  return [styles.pill, isActive ? active : inactive, extra]
}

interface FilterToggleProps {
  isExpanded: boolean
  hasActiveFilter: boolean
  onPress: () => void
}

function FilterToggle({ isExpanded, hasActiveFilter, onPress }: FilterToggleProps) {
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

interface ListingFiltersProps {
  category: ListingCategory | null
  search: string
  sort: ListingSort
  onCategoryChange: (category: ListingCategory | null) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: ListingSort) => void
}

function ListingFilters({
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: ListingFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasActiveFilter = category !== null || sort !== LISTING_SORTS.NEWEST

  const categoryOptions: CategoryMenuOption[] = [
    { id: ALL_CATEGORY_ID, label: 'All categories' },
    ...LISTING_CATEGORIES.map((categoryKey) => ({
      id: categoryKey,
      label: CATEGORY_LABELS[categoryKey],
      icon: CATEGORY_ICONS[categoryKey],
      accent: CATEGORY_TAG_COLORS[categoryKey].accent,
    })),
  ]

  const handleCategoryChange = (id: string) => {
    onCategoryChange(id === ALL_CATEGORY_ID ? null : (id as ListingCategory))
  }

  return (
    <View
      style={[
        styles.toolbar,
        isExpanded ? styles.toolbarExpanded : styles.toolbarCollapsed,
      ]}
    >
      <View style={styles.searchRow}>
        <View style={styles.searchField}>
          <Icon name="search" size={TOGGLE_ICON_SIZE} color={COLORS.mute} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search title or location…"
            placeholderTextColor={COLORS.stone}
            accessibilityLabel="Search listings"
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
                pressed && styles.clearButtonPressed,
              ]}
            >
              <Icon name="close" size={CLEAR_ICON_SIZE} color={COLORS.mute} />
            </Pressable>
          ) : null}
        </View>
        <FilterToggle
          isExpanded={isExpanded}
          hasActiveFilter={hasActiveFilter}
          onPress={() => setIsExpanded((current) => !current)}
        />
      </View>
      {isExpanded ? (
        <>
          <CategoryMenu
            ariaLabel="Filter by category"
            value={category ?? ALL_CATEGORY_ID}
            options={categoryOptions}
            onChange={handleCategoryChange}
            style={styles.categoryMenu}
          />
          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: sort === option.value }}
                onPress={() => onSortChange(option.value)}
                style={({ pressed }) => [
                  pillStyle(sort === option.value, styles.sortPill),
                  pressed && sort !== option.value && { borderColor: COLORS.ink },
                ]}
              >
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  style={[
                    TYPE.buttonSm,
                    sort === option.value ? styles.pillTextActive : styles.pillText,
                  ]}
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
  clearButtonPressed: {
    opacity: 0.6,
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
  categoryMenu: {
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
  },
  sortRow: {
    flexDirection: 'row',
    marginHorizontal: GUTTER,
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  pill: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.xs,
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
