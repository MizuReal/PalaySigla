// Full-screen listing detail, pushed on the root stack above the tab bar
// (the mobile equivalent of the web marketplace's detail modal). Browse
// surface: photo, category, title, price, quantity, description, and the
// seller block — plus the owner action block (mark as sold, remove with an
// inline two-tap confirm) when the signed-in reader owns the listing.
import { useState } from 'react'
import {
  ActivityIndicator,
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
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import ListingLocationMap from '../components/marketplace/ListingLocationMap'
import { buildOpenStreetMapUrl } from '../components/marketplace/mapConfig'
import Photo from '../components/Photo'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import useListingActions from '../hooks/useListingActions'
import useListingConversations from '../hooks/useListingConversations'
import useListingDetail from '../hooks/useListingDetail'
import usePulseOpacity from '../hooks/usePulseOpacity'
import useStartConversation from '../hooks/useStartConversation'
import useUserRating from '../hooks/useUserRating'
import useUserReviews from '../hooks/useUserReviews'
import ReviewItem, { ReviewStars } from '../components/profile/ReviewItem'
import type { ListingBuyer } from '../services/listings'
import {
  CATEGORY_LABELS,
  formatCoordinates,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../utils/format'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

const TRANSACTION_MODES = Object.freeze({
  RESERVE: 'reserve',
  SOLD: 'sold',
} as const)

type TransactionMode = (typeof TRANSACTION_MODES)[keyof typeof TRANSACTION_MODES]

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
  const { user, openAuthModal } = useAuth()
  const { showToast } = useToast()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const {
    isActing,
    error: actionError,
    reserve,
    markSold,
    release,
    remove,
    clearError,
  } = useListingActions()
  const { start, isStarting, error: startError } = useStartConversation()
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const [transactionMode, setTransactionMode] = useState<TransactionMode | null>(null)
  const [selectedBuyerId, setSelectedBuyerId] = useState('')
  const buyers = useListingConversations(transactionMode ? listingId : null)
  const sellerRating = useUserRating(listing?.user_id ?? null)
  const sellerReviews = useUserReviews(listing?.user_id ?? null)

  const isOwner = user !== null && listing?.user_id === user.id

  const ratingSummary =
    sellerRating.ratingCount > 0
      ? `${sellerRating.ratingAvg.toFixed(1)} · ${sellerRating.ratingCount} review${
          sellerRating.ratingCount === 1 ? '' : 's'
        }`
      : 'No reviews yet'

  const selectedConversation = buyers.conversations.find(
    (conversation) => conversation.buyer_id === selectedBuyerId
  )
  const selectedBuyer: ListingBuyer | null = selectedConversation
    ? {
        buyerId: selectedConversation.buyer_id,
        buyerName: selectedConversation.buyer_name,
      }
    : null
  const hasBuyerChoices = buyers.conversations.length > 0
  const canConfirm = !isActing && (!hasBuyerChoices || selectedBuyer !== null)

  const handleMessageSeller = async () => {
    if (!listing) {
      return
    }
    if (!user) {
      openAuthModal(AUTH_MODAL_MODES.LOGIN)
      return
    }
    const conversation = await start(listing)
    if (conversation) {
      navigation.navigate('Conversation', { conversationId: conversation.id })
    }
  }

  const handleOpenStreetMap = async (lat: number, lng: number) => {
    try {
      await Linking.openURL(buildOpenStreetMapUrl(lat, lng))
    } catch {
      // the pin, label, and coordinates still locate the listing if the OS
      // refuses to open the browser
    }
  }

  const openTransaction = (mode: TransactionMode) => {
    clearError()
    setSelectedBuyerId('')
    setTransactionMode(mode)
  }

  const closeTransaction = () => {
    clearError()
    setTransactionMode(null)
    setSelectedBuyerId('')
  }

  const handleConfirmTransaction = async () => {
    if (!listing || !transactionMode) {
      return
    }
    const isSold = transactionMode === TRANSACTION_MODES.SOLD
    const succeeded = isSold
      ? await markSold(listing.id, selectedBuyer)
      : await reserve(listing.id, selectedBuyer)
    if (succeeded) {
      showToast(
        isSold ? 'Listing marked as sold.' : 'Listing reserved.',
        TOAST_VARIANTS.SUCCESS
      )
      navigation.goBack()
    }
  }

  const handleRelease = async () => {
    if (!listing) {
      return
    }
    const succeeded = await release(listing.id)
    if (succeeded) {
      showToast('Reservation released.', TOAST_VARIANTS.SUCCESS)
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

  const renderBuyerPicker = () => {
    const isSold = transactionMode === TRANSACTION_MODES.SOLD
    return (
      <View style={styles.pickerPanel}>
        <Text style={[TYPE.captionMd, styles.pickerHeading]}>
          {isSold ? 'Who is this sold to?' : 'Who is this reserved for?'}
        </Text>
        {buyers.error ? (
          <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.pickerError]}>
            {buyers.error}
          </Text>
        ) : buyers.isLoading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.pickerSpinner} />
        ) : hasBuyerChoices ? (
          <View style={styles.pickerList}>
            {buyers.conversations.map((conversation) => {
              const isSelected = conversation.buyer_id === selectedBuyerId
              return (
                <Pressable
                  key={conversation.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => setSelectedBuyerId(conversation.buyer_id)}
                  style={({ pressed }) => [
                    styles.pickerOption,
                    isSelected && styles.pickerOptionSelected,
                    pressed && styles.pickerOptionPressed,
                  ]}
                >
                  <Text style={[TYPE.bodySm, styles.pickerOptionText]}>
                    {conversation.buyer_name}
                  </Text>
                  {isSelected ? (
                    <Icon name="check" size={18} color={COLORS.primary} />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        ) : (
          <Text style={[TYPE.bodySm, styles.pickerHint]}>
            No buyer conversations for this listing yet. You can continue without
            tagging a buyer — reviews will not be available for this transaction.
          </Text>
        )}
        <View style={styles.pickerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirm }}
            disabled={!canConfirm}
            onPress={handleConfirmTransaction}
            style={({ pressed }) => [
              styles.markSoldButton,
              styles.actionEqual,
              !canConfirm && styles.actionDisabled,
              pressed && canConfirm && styles.markSoldButtonPressed,
            ]}
          >
            <Text
              style={[
                TYPE.buttonSm,
                styles.markSoldLabel,
                !canConfirm && styles.actionLabelDisabled,
              ]}
            >
              {isActing ? 'Saving…' : isSold ? 'Mark as sold' : 'Reserve listing'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isActing }}
            disabled={isActing}
            onPress={closeTransaction}
            style={({ pressed }) => [
              styles.cancelButton,
              styles.actionEqual,
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

  const renderOwnerActions = () => {
    if (!isOwner || !listing) {
      return null
    }
    return (
      <View style={styles.ownerPanel}>
        <Text style={[TYPE.captionMd, styles.ownerPanelLabel]}>
          Manage this listing
        </Text>
        {transactionMode ? (
          renderBuyerPicker()
        ) : isConfirmingRemove ? (
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
                  styles.actionEqual,
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
                  styles.actionEqual,
                  isActing && styles.actionDisabled,
                  pressed && !isActing && styles.cancelButtonPressed,
                ]}
              >
                <Text style={[TYPE.buttonSm, styles.cancelLabel]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {actionError ? (
              <View accessibilityRole="alert" style={styles.actionError}>
                <Icon name="info" size={20} color={COLORS.error} />
                <Text style={[TYPE.bodySm, styles.actionErrorText]}>{actionError}</Text>
              </View>
            ) : null}
            {listing.status === 'sold' && listing.sold_to_name ? (
              <Text style={[TYPE.captionSm, styles.transactionLine]}>
                Sold to {listing.sold_to_name}
              </Text>
            ) : null}
            {listing.status === 'reserved' && listing.reserved_for_name ? (
              <Text style={[TYPE.captionSm, styles.transactionLine]}>
                Reserved for {listing.reserved_for_name}
              </Text>
            ) : null}
            {listing.status === 'active' ? (
              <View style={styles.ownerButtonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isActing }}
                  disabled={isActing}
                  onPress={() => openTransaction(TRANSACTION_MODES.RESERVE)}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    styles.actionEqual,
                    isActing && styles.actionDisabled,
                    pressed && !isActing && styles.cancelButtonPressed,
                  ]}
                >
                  <Text style={[TYPE.buttonSm, styles.cancelLabel]}>
                    Reserve for a buyer
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isActing }}
                  disabled={isActing}
                  onPress={() => openTransaction(TRANSACTION_MODES.SOLD)}
                  style={({ pressed }) => [
                    styles.markSoldButton,
                    styles.actionEqual,
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
                    Mark as sold
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {listing.status === 'reserved' ? (
              <View style={styles.ownerButtonRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isActing }}
                  disabled={isActing}
                  onPress={() => openTransaction(TRANSACTION_MODES.SOLD)}
                  style={({ pressed }) => [
                    styles.markSoldButton,
                    styles.actionEqual,
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
                    Mark as sold
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isActing }}
                  disabled={isActing}
                  onPress={handleRelease}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    styles.actionEqual,
                    isActing && styles.actionDisabled,
                    pressed && !isActing && styles.cancelButtonPressed,
                  ]}
                >
                  <Text style={[TYPE.buttonSm, styles.cancelLabel]}>
                    {isActing ? 'Releasing…' : 'Release reservation'}
                  </Text>
                </Pressable>
              </View>
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
          </>
        )}
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
            {listing.status !== 'active' ? (
              <View style={styles.chip}>
                <Text style={[TYPE.captionMd, styles.chipSold]}>
                  {listing.status === 'sold' ? 'Sold' : 'Reserved'}
                </Text>
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
          <Text style={[TYPE.captionSm, styles.posted]}>
            Posted {formatRelativeTime(listing.created_at)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View ${listing.seller_name}'s farmer profile`}
            onPress={() => navigation.navigate('FarmerProfile', { userId: listing.user_id })}
            style={({ pressed }) => [styles.sellerCard, pressed && styles.sellerCardPressed]}
          >
            <Avatar name={listing.seller_name} />
            <View style={styles.sellerInfo}>
              <Text style={[TYPE.bodyStrong, styles.sellerName]} numberOfLines={1}>
                {listing.seller_name}
              </Text>
              <View style={styles.sellerRatingRow}>
                <ReviewStars rating={Math.round(sellerRating.ratingAvg)} />
                <Text style={[TYPE.captionSm, styles.reviewsSummary]}>
                  {ratingSummary}
                </Text>
              </View>
            </View>
          </Pressable>
          {!isOwner ? (
            <View style={styles.messageSellerBlock}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isStarting }}
                disabled={isStarting}
                onPress={handleMessageSeller}
                style={({ pressed }) => [
                  styles.markSoldButton,
                  isStarting && styles.actionDisabled,
                  pressed && !isStarting && styles.markSoldButtonPressed,
                ]}
              >
                <Text
                  style={[
                    TYPE.buttonSm,
                    styles.markSoldLabel,
                    isStarting && styles.actionLabelDisabled,
                  ]}
                >
                  {isStarting ? 'Opening…' : 'Message seller'}
                </Text>
              </Pressable>
              {startError ? (
                <Text
                  accessibilityRole="alert"
                  style={[TYPE.captionSm, styles.messageSellerError]}
                >
                  {startError}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.section}>
            <Text style={[TYPE.captionMd, styles.sectionLabel]}>
              About this listing
            </Text>
            <Text style={[TYPE.bodySm, styles.description]}>
              {listing.description || 'No description provided.'}
            </Text>
          </View>
          {renderOwnerActions()}
          {hasCoordinates ? (
            <View style={styles.section}>
              <View style={styles.locationHeaderRow}>
                <Text style={[TYPE.captionMd, styles.sectionLabel]}>Location</Text>
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
          {sellerReviews.reviews.length > 0 ? (
            <View style={styles.section}>
              <Text style={[TYPE.captionMd, styles.sectionLabel]}>Reviews</Text>
              <View style={styles.reviewsList}>
                {sellerReviews.reviews.slice(0, 3).map((review) => (
                  <ReviewItem key={review.id} review={review} />
                ))}
              </View>
            </View>
          ) : null}
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
  ownerPanel: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  ownerPanelLabel: {
    color: COLORS.primary,
  },
  ownerButtonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionEqual: {
    flex: 1,
  },
  transactionLine: {
    color: COLORS.mute,
  },
  pickerPanel: {
    gap: SPACING.md,
  },
  pickerHeading: {
    color: COLORS.primary,
  },
  pickerError: {
    color: COLORS.error,
  },
  pickerSpinner: {
    marginVertical: SPACING.sm,
  },
  pickerList: {
    gap: SPACING.sm,
  },
  pickerOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  pickerOptionSelected: {
    borderColor: COLORS.primary,
  },
  pickerOptionPressed: {
    opacity: 0.7,
  },
  pickerOptionText: {
    flex: 1,
    color: COLORS.ink,
  },
  pickerHint: {
    color: COLORS.mute,
  },
  pickerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  section: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  sectionLabel: {
    color: COLORS.primary,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
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
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  sellerCardPressed: {
    opacity: 0.7,
  },
  sellerInfo: {
    flex: 1,
    minWidth: 0,
  },
  sellerName: {
    color: COLORS.ink,
  },
  sellerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  posted: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  reviewsList: {
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  reviewsSummary: {
    color: COLORS.mute,
  },
  messageSellerBlock: {
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  messageSellerError: {
    color: COLORS.error,
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
