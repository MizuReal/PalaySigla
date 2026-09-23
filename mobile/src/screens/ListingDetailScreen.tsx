// Full-screen listing detail, pushed on the root stack above the tab bar
// (the mobile equivalent of the web marketplace's detail modal). Browse
// surface: photo, category, title, price, quantity, description, and the
// seller block — plus the owner action block (mark as sold, remove with an
// inline two-tap confirm) when the signed-in reader owns the listing.
import { useState } from 'react'
import {
  Animated,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack'
import Icon from '../components/Icon'
import ListingLocationMap from '../components/marketplace/ListingLocationMap'
import { buildOpenStreetMapUrl } from '../components/marketplace/mapConfig'
import Photo from '../components/Photo'
import { useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import useListingActions from '../hooks/useListingActions'
import useListingDetail from '../hooks/useListingDetail'
import usePulseOpacity from '../hooks/usePulseOpacity'
import {
  CATEGORY_LABELS,
  formatCoordinates,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../utils/format'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

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

function ListingDetailBody({ listingId }: { listingId: string }) {
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

interface ListingDetailContentProps {
  listingId: string
  onRetry: () => void
}

function ListingDetailContent({ listingId, onRetry }: ListingDetailContentProps) {
  const { listing, imageUrl, isLoading, error } = useListingDetail(listingId)
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { isActing, error: actionError, markSold, remove, clearError } =
    useListingActions()
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  const isOwner = user !== null && listing?.user_id === user.id

  const handleOpenStreetMap = async (lat: number, lng: number) => {
    try {
      await Linking.openURL(buildOpenStreetMapUrl(lat, lng))
    } catch {
      // the pin, label, and coordinates still locate the listing if the OS
      // refuses to open the browser
    }
  }

  const handleMarkSold = async () => {
    if (!listing) {
      return
    }
    const succeeded = await markSold(listing.id)
    if (succeeded) {
      showToast('Listing marked as sold.', TOAST_VARIANTS.SUCCESS)
      navigation.goBack()
    }
  }

  const handleRemove = async () => {
    if (!listing) {
      return
    }
    if (!isConfirmingRemove) {
      clearError()
      setIsConfirmingRemove(true)
      return
    }
    const succeeded = await remove(listing.id)
    if (succeeded) {
      showToast('Listing removed.', TOAST_VARIANTS.SUCCESS)
      navigation.goBack()
    }
  }

  const handleCancelRemove = () => {
    clearError()
    setIsConfirmingRemove(false)
  }

  const renderOwnerActions = () => {
    if (!isOwner || !listing) {
      return null
    }
    if (isConfirmingRemove) {
      return (
        <View style={styles.confirmPanel}>
          <Text style={[TYPE.bodySm, styles.confirmText]}>
            Remove this listing permanently?
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isActing }}
              disabled={isActing}
              onPress={handleRemove}
              style={({ pressed }) => [
                styles.dangerButton,
                isActing && styles.actionDisabled,
                pressed && !isActing && styles.dangerButtonPressed,
              ]}
            >
              <Text
                style={[
                  TYPE.buttonSm,
                  styles.dangerLabel,
                  isActing && styles.actionLabelDisabled,
                ]}
              >
                {isActing ? 'Removing…' : 'Yes, remove it'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isActing }}
              disabled={isActing}
              onPress={handleCancelRemove}
              style={({ pressed }) => [
                styles.cancelButton,
                isActing && styles.actionDisabled,
                pressed && !isActing && styles.cancelButtonPressed,
              ]}
            >
              <Text style={[TYPE.buttonSm, styles.cancelLabel]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )
    }
    return (
      <View style={styles.ownerBlock}>
        {actionError ? (
          <View accessibilityRole="alert" style={styles.actionError}>
            <Icon name="info" size={20} color={COLORS.error} />
            <Text style={[TYPE.bodySm, styles.actionErrorText]}>{actionError}</Text>
          </View>
        ) : null}
        {listing.status === 'active' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isActing }}
            disabled={isActing}
            onPress={handleMarkSold}
            style={({ pressed }) => [
              styles.markSoldButton,
              isActing && styles.actionDisabled,
              pressed && !isActing && styles.markSoldButtonPressed,
            ]}
          >
            <Text
              style={[
                TYPE.buttonSm,
                styles.markSoldLabel,
                isActing && styles.actionLabelDisabled,
              ]}
            >
              {isActing ? 'Updating…' : 'Mark as sold'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isActing }}
          disabled={isActing}
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.dangerOutlineButton,
            isActing && styles.actionDisabled,
            pressed && !isActing && styles.dangerOutlineButtonPressed,
          ]}
        >
          <Text
            style={[
              TYPE.buttonSm,
              styles.dangerOutlineLabel,
              isActing && styles.actionLabelDisabled,
            ]}
          >
            Remove listing
          </Text>
        </Pressable>
      </View>
    )
  }

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
    const hasCoordinates =
      Number.isFinite(listing.lat) && Number.isFinite(listing.lng)
    return (
      <View style={styles.content}>
        <Photo
          uri={imageUrl}
          alt={listing.title}
          fallbackLabel={listing.title}
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
              {formatPrice(listing.price ?? 0)}
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
          {renderOwnerActions()}
          {hasCoordinates ? (
            <View style={styles.locationSection}>
              <View style={styles.locationHeaderRow}>
                <Text style={[TYPE.captionMd, styles.locationHeading]}>
                  Location
                </Text>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => handleOpenStreetMap(listing.lat, listing.lng)}
                  hitSlop={SPACING.sm}
                  style={({ pressed }) => [
                    styles.osmLink,
                    pressed && styles.osmLinkPressed,
                  ]}
                >
                  <Text style={[TYPE.captionSm, styles.osmLinkLabel]}>
                    Open in OpenStreetMap
                  </Text>
                </Pressable>
              </View>
              <ListingLocationMap
                lat={listing.lat}
                lng={listing.lng}
                locationLabel={listing.location_label}
              />
              <View style={styles.locationRow}>
                <Icon name="pin" size={16} color={COLORS.mute} />
                <Text style={[TYPE.bodySm, styles.locationLabel]}>
                  {listing.location_label}
                </Text>
              </View>
              <Text style={[TYPE.captionSm, styles.coordinates]}>
                {formatCoordinates(listing.lat, listing.lng)}
              </Text>
            </View>
          ) : null}
          <View style={styles.sellerBlock}>
            <Text style={[TYPE.bodyStrong, styles.sellerName]}>
              {listing.seller_name}
            </Text>
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

type ListingDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'ListingDetail'
>

function ListingDetailScreen({ route, navigation }: ListingDetailScreenProps) {
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
  ownerBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  actionError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  actionErrorText: {
    flex: 1,
    color: COLORS.ink,
  },
  markSoldButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  markSoldButtonPressed: {
    backgroundColor: COLORS.primary,
  },
  markSoldLabel: {
    color: COLORS.ink,
  },
  dangerOutlineButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  dangerOutlineButtonPressed: {
    backgroundColor: COLORS.error,
  },
  dangerOutlineLabel: {
    color: COLORS.error,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabelDisabled: {
    color: COLORS.ash,
  },
  confirmPanel: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
  },
  confirmText: {
    color: COLORS.ink,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  dangerButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  dangerButtonPressed: {
    backgroundColor: COLORS.error,
  },
  dangerLabel: {
    color: COLORS.error,
  },
  cancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelButtonPressed: {
    borderColor: COLORS.primary,
  },
  cancelLabel: {
    color: COLORS.ink,
  },
  locationSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.xxl,
    paddingTop: SPACING.lg,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  locationHeading: {
    color: COLORS.primary,
  },
  osmLink: {
    minHeight: 44,
    justifyContent: 'center',
  },
  osmLinkPressed: {
    opacity: 0.6,
  },
  osmLinkLabel: {
    color: COLORS.linkBlue,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  locationLabel: {
    flex: 1,
    color: COLORS.ink,
  },
  coordinates: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  sellerBlock: {
    marginTop: SPACING.md,
  },
  sellerName: {
    color: COLORS.ink,
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
