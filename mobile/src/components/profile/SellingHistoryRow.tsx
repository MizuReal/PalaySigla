// One selling-history row — the web SellingHistoryRow at phone scale: a 96px
// 4:3 thumbnail, title with a status chip (Active / Sold / Deleted), price +
// unit, and a category + listed/sold/deleted date line. Deleted rows are
// read-only; active and sold rows reopen the detail screen for owner actions.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Photo from '../Photo'
import useListingImageUrl from '../../hooks/useListingImageUrl'
import {
  CATEGORY_LABELS,
  formatDate,
  formatPrice,
  UNIT_LABELS,
} from '../../utils/format'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'
import type { ListingWithImages } from '../../types/domain'

const THUMB_WIDTH = 96
const THUMB_ASPECT_RATIO = 4 / 3

const ROW_STATUS = Object.freeze({
  ACTIVE: 'active',
  SOLD: 'sold',
  DELETED: 'deleted',
} as const)

type RowStatus = (typeof ROW_STATUS)[keyof typeof ROW_STATUS]

const STATUS_LABELS: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: 'Active',
  [ROW_STATUS.SOLD]: 'Sold',
  [ROW_STATUS.DELETED]: 'Deleted',
})

const STATUS_TEXT_COLORS: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: COLORS.primary,
  [ROW_STATUS.SOLD]: COLORS.ink,
  [ROW_STATUS.DELETED]: COLORS.mute,
})

function resolveStatus(listing: ListingWithImages): RowStatus {
  if (listing.deleted_at) {
    return ROW_STATUS.DELETED
  }
  return listing.status === 'sold' ? ROW_STATUS.SOLD : ROW_STATUS.ACTIVE
}

function buildDateSummary(listing: ListingWithImages): string {
  const parts = [`Listed ${formatDate(listing.created_at)}`]
  if (listing.sold_at) {
    parts.push(`Sold ${formatDate(listing.sold_at)}`)
  }
  if (listing.deleted_at) {
    parts.push(`Deleted ${formatDate(listing.deleted_at)}`)
  }
  return parts.join(' · ')
}

interface SellingHistoryRowProps {
  listing: ListingWithImages
  onSelect: (listing: ListingWithImages) => void
}

function SellingHistoryRow({ listing, onSelect }: SellingHistoryRowProps) {
  const status = resolveStatus(listing)
  const image = listing.listing_images?.[0]
  const { url: imageUrl } = useListingImageUrl(image?.storage_path ?? '')

  const content = (
    <>
      {imageUrl ? (
        <Photo uri={imageUrl} alt={listing.title} style={styles.thumb} />
      ) : (
        <View style={styles.thumbFallback} accessible={false} />
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={2}>
            {listing.title}
          </Text>
          <View style={styles.chip}>
            <Text
              style={[TYPE.captionMd, { color: STATUS_TEXT_COLORS[status] }]}
            >
              {STATUS_LABELS[status]}
            </Text>
          </View>
        </View>
        <View style={styles.priceRow}>
          <Text style={[TYPE.headingSm, styles.price]}>
            {formatPrice(listing.price ?? 0)}
          </Text>
          <Text style={[TYPE.captionSm, styles.unit]}>
            {UNIT_LABELS[listing.unit]}
          </Text>
        </View>
        <Text style={[TYPE.captionSm, styles.meta]}>
          {CATEGORY_LABELS[listing.category]} · {buildDateSummary(listing)}
        </Text>
      </View>
    </>
  )

  if (status === ROW_STATUS.DELETED) {
    return <View style={styles.row}>{content}</View>
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${STATUS_LABELS[status]}`}
      onPress={() => onSelect(listing)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
  },
  rowPressed: {
    borderColor: COLORS.primary,
  },
  thumb: {
    width: THUMB_WIDTH,
    aspectRatio: THUMB_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  thumbFallback: {
    width: THUMB_WIDTH,
    aspectRatio: THUMB_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    flexShrink: 1,
    color: COLORS.ink,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  meta: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
})

export default SellingHistoryRow
