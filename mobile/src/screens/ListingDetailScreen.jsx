// Full-screen listing detail, pushed on the root stack above the tab bar
// (the mobile equivalent of the web marketplace's detail modal). Read-only
// browse surface: photo, category, title, price, quantity, description, and
// the seller block. Owner actions stay absent until auth exists.
import { useState } from 'react'
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from '../components/Icon.jsx'
import Photo from '../components/Photo.jsx'
import useListingDetail from '../hooks/useListingDetail.js'
import usePulseOpacity from '../hooks/usePulseOpacity.js'
import {
  CATEGORY_LABELS,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../utils/format.js'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens.js'

function DetailSkeleton() {
  const opacity = usePulseOpacity()
  return (
    <Animated.View
      accessible
      accessibilityLabel="Loading listing"
      style={[styles.skeleton, { opacity }]}
    >
      <View style={styles.skeletonPhoto} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
        <View style={[styles.skeletonBar, styles.skeletonBarThird]} />
        <View style={[styles.skeletonBar, styles.skeletonBarFull]} />
        <View style={[styles.skeletonBar, styles.skeletonBarPartial]} />
      </View>
    </Animated.View>
  )
}

function ListingDetailBody({ listingId }) {
  // a retry remounts the hook owner below so the load restarts from a
  // visible loading state (the hook runs once per mounted id)
  const [retryNonce, setRetryNonce] = useState(0)

  return (
    <ListingDetailContent
      key={retryNonce}
      listingId={listingId}
      onRetry={() => setRetryNonce((current) => current + 1)}
    />
  )
}

function ListingDetailContent({ listingId, onRetry }) {
  const { listing, imageUrl, isLoading, error } = useListingDetail(listingId)

  const renderBody = () => {
    if (isLoading) {
      return <DetailSkeleton />
    }
    if (error || !listing) {
      return (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.errorText]}>
            {error ?? 'Listing unavailable.'}
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
      <View style={styles.content}>
        <Photo
          uri={imageUrl}
          alt={listing.title}
          fallbackLabel={listing.title}
          loading={Boolean(listing.listing_images?.[0]) && !imageUrl}
          style={styles.photo}
        />
        <View style={styles.details}>
          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={[TYPE.captionMd, styles.chipCategory]}>
                {CATEGORY_LABELS[listing.category]}
              </Text>
            </View>
            {listing.status === 'sold' ? (
              <View style={styles.chip}>
                <Text style={[TYPE.captionMd, styles.chipSold]}>Sold</Text>
              </View>
            ) : null}
          </View>
          <Text style={[TYPE.headingLg, styles.title]}>{listing.title}</Text>
          <View style={styles.priceRow}>
            <Text style={[TYPE.headingMd, styles.price]}>
              {formatPrice(listing.price)}
            </Text>
            <Text style={[TYPE.captionSm, styles.unit]}>
              {UNIT_LABELS[listing.unit]}
            </Text>
          </View>
          {listing.quantity !== null && listing.quantity !== undefined ? (
            <Text style={[TYPE.captionSm, styles.quantity]}>
              Quantity: {listing.quantity} {listing.unit}
            </Text>
          ) : null}
          {listing.description ? (
            <Text style={[TYPE.bodySm, styles.description]}>
              {listing.description}
            </Text>
          ) : null}
          <View style={styles.sellerBlock}>
            <Text style={[TYPE.bodyStrong, styles.sellerName]}>
              {listing.seller_name}
            </Text>
            <View style={styles.locationRow}>
              <Icon name="pin" size={16} color={COLORS.mute} />
              <Text style={[TYPE.captionSm, styles.locationText]}>
                {listing.location_label}
              </Text>
            </View>
            <Text style={[TYPE.captionSm, styles.posted]}>
              Posted {formatRelativeTime(listing.created_at)}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {renderBody()}
    </ScrollView>
  )
}

function ListingDetailScreen({ route, navigation }) {
  const { listingId } = route.params
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
          >
            <Icon name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[TYPE.captionMd, styles.topBarLabel]}>Marketplace</Text>
        </View>
      </View>
      <ListingDetailBody listingId={listingId} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.6,
  },
  topBarLabel: {
    color: COLORS.mute,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
    flexGrow: 1,
  },
  photo: {
    aspectRatio: 4 / 3,
  },
  content: {
    alignSelf: 'stretch',
  },
  details: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
  },
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipCategory: {
    color: COLORS.primary,
  },
  chipSold: {
    color: COLORS.ink,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.md,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  quantity: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  description: {
    color: COLORS.body,
    marginTop: SPACING.lg,
  },
  sellerBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  sellerName: {
    color: COLORS.ink,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  locationText: {
    flex: 1,
    color: COLORS.mute,
  },
  posted: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  skeleton: {
    flex: 1,
    alignSelf: 'stretch',
  },
  skeletonPhoto: {
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBody: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  skeletonBar: {
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
  skeletonBarWide: {
    width: '70%',
    height: 22,
  },
  skeletonBarThird: {
    width: '35%',
  },
  skeletonBarFull: {
    width: '100%',
  },
  skeletonBarPartial: {
    width: '85%',
  },
  errorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: GUTTER,
    alignSelf: 'stretch',
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
})

export default ListingDetailScreen
