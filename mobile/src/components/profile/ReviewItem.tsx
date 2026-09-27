import { StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import { formatDate } from '../../utils/format'
import { MAX_RATING } from '../../services/reviews'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'
import type { ReviewRow } from '../../types/domain'

interface ReviewStarsProps {
  rating: number
}

function ReviewStars({ rating }: ReviewStarsProps) {
  return (
    <View
      style={styles.stars}
      accessible
      accessibilityLabel={`${rating} out of ${MAX_RATING}`}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <Icon
          key={index}
          name="star"
          size={16}
          color={index < rating ? COLORS.primary : COLORS.stone}
          filled={index < rating}
        />
      ))}
    </View>
  )
}

function ReviewItem({ review }: { review: ReviewRow }) {
  return (
    <View style={styles.item}>
      <View style={styles.headerRow}>
        <Text style={[TYPE.bodyStrong, styles.name]} numberOfLines={1}>
          {review.reviewer_name}
        </Text>
        <Text style={[TYPE.captionSm, styles.date]}>
          {formatDate(review.created_at)}
        </Text>
      </View>
      <ReviewStars rating={review.rating} />
      <Text style={[TYPE.captionSm, styles.listing]} numberOfLines={1}>
        on {review.listing_title}
      </Text>
      {review.comment ? (
        <Text style={[TYPE.bodySm, styles.comment]}>{review.comment}</Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  item: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
    gap: SPACING.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  name: {
    flex: 1,
    color: COLORS.ink,
  },
  date: {
    color: COLORS.mute,
  },
  stars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xxs,
  },
  listing: {
    color: COLORS.mute,
  },
  comment: {
    color: COLORS.body,
    marginTop: SPACING.xs,
  },
})

export default ReviewItem
export { ReviewStars }
