// The keyed listing feed: owns the useListings state machine and renders
// every feed state (initial skeletons, error panel, empty state, paginated
// cards) under a compact hero band. The parent remounts this component via
// key on filter change so each change starts from a fresh page 1 with
// visible loading state — the web page's remount trick ported to a list.
import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Button from '../Button.jsx'
import ListingCard from './ListingCard.jsx'
import ListingCardSkeleton from './ListingCardSkeleton.jsx'
import useListings from '../../hooks/useListings.js'
import { LISTING_SORTS } from '../../services/listings.js'
import {
  COLORS,
  CARD_GAP,
  GUTTER,
  RADIUS,
  SPACING,
  TYPE,
} from '../../theme/designTokens.js'

const SKELETON_COUNT = 6

const EMPTY_FILTERED_COPY =
  'Nothing matches those filters right now. Try widening the search.'
const EMPTY_MARKET_COPY =
  'No one has posted a listing yet. Check back soon.'

function ListingFeed({
  category,
  search,
  sort,
  onSelectListing,
  onPostPress,
  onRetry,
}) {
  const {
    listings,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    reload,
    hasMore,
  } = useListings({ category, search, sort })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const hasActiveFilters =
    category !== null || search !== '' || sort !== LISTING_SORTS.NEWEST

  const handleRefresh = useCallback(async () => {
    if (isInitialLoading) {
      return
    }
    setIsRefreshing(true)
    try {
      await reload()
    } finally {
      setIsRefreshing(false)
    }
  }, [isInitialLoading, reload])

  const handleEndReached = () => {
    if (hasMore && !isLoadingMore && !isInitialLoading && !error) {
      loadMore()
    }
  }

  const feedData = isInitialLoading || error ? [] : listings

  const renderHeader = () => (
    <View style={styles.hero}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Marketplace</Text>
      <Text style={[TYPE.headingXl, styles.title]}>
        Buy and sell straight from the sakahan.
      </Text>
      <Text style={[TYPE.bodyMd, styles.sub]}>
        Farmers and buyers list palay, rice, seeds, and machinery — with a
        photo and a pin on the map so you know exactly where it is.
      </Text>
      <View style={styles.postButton}>
        <Button label="Post a listing" fullWidth onPress={onPostPress} />
      </View>
      {!isInitialLoading && !error && listings.length > 0 ? (
        <Text style={[TYPE.captionSm, styles.count]}>
          {total === 1 ? '1 listing' : `${total} listings`}
        </Text>
      ) : null}
    </View>
  )

  const renderEmpty = () => {
    if (isInitialLoading) {
      return Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <ListingCardSkeleton key={index} />
      ))
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
            <Text style={[TYPE.buttonSm, styles.retryText]}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <View style={[styles.panel, styles.emptyPanel]}>
        <Text style={[TYPE.headingSm, styles.emptyTitle]}>No listings yet.</Text>
        <Text style={[TYPE.bodySm, styles.emptySub]}>
          {hasActiveFilters ? EMPTY_FILTERED_COPY : EMPTY_MARKET_COPY}
        </Text>
      </View>
    )
  }

  const renderFooter = () => {
    if (!isLoadingMore) {
      return null
    }
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={feedData}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ListingCard listing={item} onPress={onSelectListing} />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={<View style={styles.feedEmpty}>{renderEmpty()}</View>}
      ListFooterComponent={renderFooter}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.4}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.primary}
          colors={[COLORS.primary]}
          progressBackgroundColor={COLORS.canvas}
        />
      }
      keyboardShouldPersistTaps="handled"
    />
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  listContent: {
    paddingHorizontal: GUTTER,
    paddingBottom: SPACING.xxl,
    gap: CARD_GAP,
    // short states (loading/error/empty) still fill the viewport so the
    // pull-to-refresh gesture is reachable before any card has loaded
    flexGrow: 1,
  },
  hero: {
    paddingTop: SPACING.xl,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  sub: {
    color: COLORS.body,
    marginTop: SPACING.sm,
  },
  postButton: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
  count: {
    color: COLORS.mute,
    marginTop: SPACING.lg,
  },
  feedEmpty: {
    gap: CARD_GAP,
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
  retryText: {
    color: COLORS.ink,
  },
  emptyPanel: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  emptyTitle: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.mute,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
})

export default ListingFeed
