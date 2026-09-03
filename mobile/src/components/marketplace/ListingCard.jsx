// One active listing in the feed — the DESIGN.md listing-card treatment on
// phones: 4:3 photo with a category badge chip, title, price + unit, and a
// pin + location + posted-time caption. The whole card is one press target.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon.jsx'
import Photo from '../Photo.jsx'
import useListingImageUrl from '../../hooks/useListingImageUrl.js'
import {
  CATEGORY_LABELS,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../../utils/format.js'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens.js'

const PIN_ICON_SIZE = 16

function ListingCard({ listing, onPress }) {
  const image = listing.listing_images?.[0]
  const imageUrl = useListingImageUrl(image ? image.storage_path : '')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={listing.title}
      onPress={() => onPress(listing)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.imageWrap}>
        <Photo
          uri={imageUrl}
          alt={listing.title}
          fallbackLabel={listing.title}
          loading={Boolean(image) && !imageUrl}
          style={styles.photo}
        />
        <View pointerEvents="none" style={styles.chip}>
          <Text style={[TYPE.captionMd, styles.chipText]}>
            {CATEGORY_LABELS[listing.category]}
          </Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text numberOfLines={2} style={[TYPE.cardTitle, styles.title]}>
          {listing.title}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[TYPE.headingSm, styles.price]}>
            {formatPrice(listing.price)}
          </Text>
          <Text style={[TYPE.captionSm, styles.unit]}>
            {UNIT_LABELS[listing.unit]}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <Icon name="pin" size={PIN_ICON_SIZE} color={COLORS.mute} />
          <Text numberOfLines={1} style={[TYPE.captionSm, styles.locationText]}>
            {listing.location_label} · {formatRelativeTime(listing.created_at)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    alignSelf: 'stretch',
  },
  cardPressed: {
    borderColor: COLORS.primary,
  },
  imageWrap: {
    alignSelf: 'stretch',
  },
  photo: {
    aspectRatio: 4 / 3,
  },
  chip: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.primary,
  },
  body: {
    padding: SPACING.lg,
  },
  title: {
    color: COLORS.ink,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  price: {
    color: COLORS.primary,
  },
  unit: {
    color: COLORS.mute,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  locationText: {
    flex: 1,
    color: COLORS.mute,
  },
})

export default ListingCard
