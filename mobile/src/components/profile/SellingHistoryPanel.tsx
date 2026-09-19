// Selling history — the web SellingHistoryPanel ported into the Settings
// profile surface: status filter pills, a keyed history list (skeletons,
// per-filter empty copy, error retry, load more), and an event subscription so
// owner actions taken on the detail screen refresh the list on return.
import { useEffect, useState } from 'react'
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import SellingHistoryRow from './SellingHistoryRow'
import useMyListings from '../../hooks/useMyListings'
import usePulseOpacity from '../../hooks/usePulseOpacity'
import { useAuth } from '../../context/authContext'
import { MY_LISTING_FILTERS } from '../../services/listings'
import type { MyListingFilter } from '../../services/listings'
import { subscribeToListingsChanged } from '../../utils/listingEvents'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'
import type { ListingWithImages } from '../../types/domain'

const SKELETON_COUNT = 3

interface HistoryFilterOption {
  id: MyListingFilter
  label: string
}

const HISTORY_FILTERS: readonly HistoryFilterOption[] = Object.freeze([
  { id: MY_LISTING_FILTERS.ALL, label: 'All' },
  { id: MY_LISTING_FILTERS.ACTIVE, label: 'Active' },
  { id: MY_LISTING_FILTERS.SOLD, label: 'Sold' },
  { id: MY_LISTING_FILTERS.DELETED, label: 'Deleted' },
])

const EMPTY_MESSAGES: Record<MyListingFilter, string> = Object.freeze({
  [MY_LISTING_FILTERS.ALL]:
    'You have not listed anything yet. Post your harvest from the marketplace and it will show up here.',
  [MY_LISTING_FILTERS.ACTIVE]:
    'No active listings right now. Post one from the marketplace.',
  [MY_LISTING_FILTERS.SOLD]:
    'Nothing sold yet. Mark a listing as sold and it will show up here.',
  [MY_LISTING_FILTERS.DELETED]:
    'No removed listings. Listings you remove stay here for your records.',
})

function HistorySkeleton() {
  const opacity = usePulseOpacity()
  return (
    <View style={styles.skeletonStack}>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <Animated.View
          key={index}
          accessible
          accessibilityLabel="Loading your listings"
          style={[styles.skeletonRow, { opacity }]}
        >
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonBody}>
            <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
            <View style={[styles.skeletonBar, styles.skeletonBarThird]} />
            <View style={[styles.skeletonBar, styles.skeletonBarFull]} />
          </View>
        </Animated.View>
      ))}
    </View>
  )
}

interface SellingHistoryListProps {
  userId: string
  filter: MyListingFilter
  onSelectListing: (listing: ListingWithImages) => void
  onRetry: () => void
}

function SellingHistoryList({
  userId,
  filter,
  onSelectListing,
  onRetry,
}: SellingHistoryListProps) {
  const {
    listings,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
  } = useMyListings({ userId, filter })

  if (isInitialLoading) {
    return <HistorySkeleton />
  }

  if (error) {
    return (
      <View style={[styles.panel, styles.errorPanel]}>
        <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.errorText]}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
          ]}
        >
          <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  if (listings.length === 0) {
    return (
      <View style={[styles.panel, styles.emptyPanel]}>
        <Text style={[TYPE.bodySm, styles.emptyText]}>{EMPTY_MESSAGES[filter]}</Text>
      </View>
    )
  }

  return (
    <View>
      <View style={styles.listStack}>
        {listings.map((listing) => (
          <SellingHistoryRow
            key={listing.id}
            listing={listing}
            onSelect={onSelectListing}
          />
        ))}
      </View>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          disabled={isLoadingMore}
          onPress={loadMore}
          style={({ pressed }) => [
            styles.loadMoreButton,
            pressed && !isLoadingMore && styles.retryButtonPressed,
          ]}
        >
          <Text
            style={[
              TYPE.buttonMd,
              isLoadingMore ? styles.retryLabelDisabled : styles.retryLabel,
            ]}
          >
            {isLoadingMore ? 'Loading more…' : 'Load more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

interface SellingHistoryPanelProps {
  onSelectListing: (listing: ListingWithImages) => void
}

function SellingHistoryPanel({ onSelectListing }: SellingHistoryPanelProps) {
  const { user } = useAuth()
  const [filter, setFilter] = useState<MyListingFilter>(MY_LISTING_FILTERS.ALL)
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    // a post or owner action anywhere in the app refreshes this list when the
    // user comes back to it
    return subscribeToListingsChanged(() => {
      setRefreshNonce((current) => current + 1)
    })
  }, [])

  if (!user) {
    return null
  }

  return (
    <View>
      <Text style={[TYPE.headingSm, styles.title]}>Selling history</Text>
      <Text style={[TYPE.bodySm, styles.lead]}>
        Everything you have listed, sold, or removed.
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroller}
        contentContainerStyle={styles.filterRow}
      >
        {HISTORY_FILTERS.map((option) => {
          const isActive = filter === option.id
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              onPress={() => setFilter(option.id)}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && !isActive && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  TYPE.buttonSm,
                  isActive ? styles.pillTextActive : styles.pillText,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      <View style={styles.listWrap}>
        <SellingHistoryList
          key={`${filter}|${refreshNonce}`}
          userId={user.id}
          filter={filter}
          onSelectListing={onSelectListing}
          onRetry={() => setRefreshNonce((current) => current + 1)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    color: COLORS.ink,
  },
  lead: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  filterScroller: {
    marginTop: SPACING.lg,
    flexGrow: 0,
  },
  filterRow: {
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
  listWrap: {
    marginTop: SPACING.lg,
  },
  listStack: {
    gap: SPACING.md,
  },
  panel: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  errorPanel: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
  },
  errorText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptyPanel: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  emptyText: {
    color: COLORS.body,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  retryButtonPressed: {
    borderColor: COLORS.primary,
  },
  retryLabel: {
    color: COLORS.ink,
  },
  retryLabelDisabled: {
    color: COLORS.ash,
  },
  loadMoreButton: {
    minHeight: 44,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  skeletonStack: {
    gap: SPACING.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
  },
  skeletonThumb: {
    width: 96,
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBody: {
    flex: 1,
    gap: SPACING.sm,
  },
  skeletonBar: {
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBarWide: {
    width: '65%',
    height: 20,
  },
  skeletonBarThird: {
    width: '35%',
  },
  skeletonBarFull: {
    width: '80%',
  },
})

export default SellingHistoryPanel
