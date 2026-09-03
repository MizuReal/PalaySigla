// Marketplace filter toolbar — the DESIGN.md marketplace-filters treatment
// on a surface-soft band: a search field (search-input height), category
// pill-tabs in a horizontal scroll row, and a three-way sort segmented
// control. Fully controlled; the screen owns the debounced search state.
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { LISTING_CATEGORIES, LISTING_SORTS } from '../../services/listings.js'
import { CATEGORY_LABELS } from '../../utils/format.js'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../../theme/designTokens.js'

const SEARCH_INPUT_HEIGHT = 40

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

function ListingFilters({
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}) {
  return (
    <View style={styles.toolbar}>
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
    </View>
  )
}

const styles = StyleSheet.create({
  toolbar: {
    backgroundColor: COLORS.surfaceSoft,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
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
