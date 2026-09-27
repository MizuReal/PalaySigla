import { StyleSheet, Text, View } from 'react-native'
import Photo from '../Photo'
import { CATEGORY_LABELS, formatPrice, UNIT_LABELS } from '../../utils/format'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'
import type { ListingWithImages } from '../../types/domain'

interface ListingInquiryCardProps {
  title: string
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  isUnavailable: boolean
}

// Read-only product context pinned at the top of a listing conversation, so
// both parties always know which listing the thread is about.
function ListingInquiryCard({
  title,
  listing,
  imageUrl,
  isLoading,
  isUnavailable,
}: ListingInquiryCardProps) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Product this conversation is about: ${title}`}
    >
      <Text style={[TYPE.captionMd, styles.eyebrow]}>User inquired about this product</Text>
      <View style={styles.row}>
        <Photo
          uri={imageUrl}
          alt={title}
          fallbackLabel={title}
          loading={isLoading}
          style={styles.thumb}
        />
        <View style={styles.info}>
          <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={2}>
            {title}
          </Text>
          {isLoading ? (
            <View style={styles.skeleton} accessible={false}>
              <View style={[styles.skeletonBar, styles.skeletonBarWide]} />
              <View style={[styles.skeletonBar, styles.skeletonBarNarrow]} />
            </View>
          ) : isUnavailable || !listing ? (
            <Text style={[TYPE.bodySm, styles.unavailable]}>
              This listing is no longer available.
            </Text>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={[TYPE.headingMd, styles.price]}>
                  {formatPrice(listing.price ?? 0)}
                </Text>
                <Text style={[TYPE.captionSm, styles.unit]}>
                  {UNIT_LABELS[listing.unit]}
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={[TYPE.captionMd, styles.chipText]}>
                  {CATEGORY_LABELS[listing.category]}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  thumb: {
    width: 80,
    height: 80,
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
  skeleton: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  skeletonBar: {
    height: 16,
    backgroundColor: COLORS.canvas,
  },
  skeletonBarWide: {
    width: '40%',
  },
  skeletonBarNarrow: {
    width: '28%',
  },
  unavailable: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  chip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.ink,
  },
})

export default ListingInquiryCard
