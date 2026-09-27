import { Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import Photo from '../Photo'
import { CATEGORY_LABELS, formatPrice, UNIT_LABELS } from '../../utils/format'
import { CATEGORY_ICONS } from '../../utils/listingIcons'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'
import type { ListingWithImages } from '../../types/domain'

const THUMB_SIZE = 40
const CHIP_ICON_SIZE = 14
const CHEVRON_SIZE = 16

interface ListingContextBarProps {
  title: string
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  isUnavailable: boolean
  onOpen?: () => void
}

// Slim product context pinned under the thread header: a 40px thumbnail, the
// title + price, and the per-category tag. Tapping opens the listing when it
// is still available. Replaces the former tall inquiry card so the transcript
// keeps the vertical space.
function ListingContextBar({
  title,
  listing,
  imageUrl,
  isLoading,
  isUnavailable,
  onOpen,
}: ListingContextBarProps) {
  const hasListing = Boolean(listing) && !isLoading && !isUnavailable
  const isInteractive = Boolean(onOpen) && hasListing

  const content = (
    <>
      <Photo
        uri={imageUrl}
        alt={title}
        fallbackLabel={title}
        loading={isLoading}
        style={styles.thumb}
      />
      <View style={styles.info}>
        <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={1}>
          {title}
        </Text>
        {isLoading ? (
          <View style={styles.skeleton} accessible={false}>
            <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
            <View style={[styles.skeletonBar, styles.skeletonBarNarrow]} />
          </View>
        ) : !listing || isUnavailable ? (
          <Text style={[TYPE.captionSm, styles.unavailable]}>
            This listing is no longer available.
          </Text>
        ) : (
          <View style={styles.priceRow}>
            <Text style={[TYPE.bodyStrong, styles.price]}>
              {formatPrice(listing.price ?? 0)}
            </Text>
            <Text style={[TYPE.captionSm, styles.unit]}>
              {UNIT_LABELS[listing.unit]}
            </Text>
          </View>
        )}
      </View>
      {listing && hasListing ? (
        <View style={styles.chip}>
          <Icon
            name={CATEGORY_ICONS[listing.category]}
            size={CHIP_ICON_SIZE}
            color={COLORS.onPrimary}
          />
          <Text style={[TYPE.captionXs, styles.chipText]}>
            {CATEGORY_LABELS[listing.category]}
          </Text>
        </View>
      ) : null}
      {isInteractive ? (
        <Icon name="chevron-right" size={CHEVRON_SIZE} color={COLORS.mute} />
      ) : null}
    </>
  )

  if (isInteractive) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open listing: ${title}`}
        onPress={onOpen}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View
      style={styles.bar}
      accessible
      accessibilityLabel={`Product this conversation is about: ${title}`}
    >
      {content}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingVertical: SPACING.sm,
  },
  barPressed: {
    opacity: 0.7,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: COLORS.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginTop: 2,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  unavailable: {
    color: COLORS.mute,
    marginTop: 2,
  },
  skeleton: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  skeletonBar: {
    height: 12,
    backgroundColor: COLORS.canvas,
  },
  skeletonBarWide: {
    width: 96,
  },
  skeletonBarNarrow: {
    width: 64,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 2,
  },
  chipText: {
    color: COLORS.onPrimary,
  },
})

export default ListingContextBar
