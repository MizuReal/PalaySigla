// Ratings & reviews card — the web ReviewsCard placeholder ported: five stars
// from the rating average plus the exact "Reviews open with the next release."
// copy. Read-only until review submission ships.
import { StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const MAX_RATING = 5

interface ReviewsCardProps {
  ratingAvg: number
  ratingCount: number
}

function ReviewsCard({ ratingAvg, ratingCount }: ReviewsCardProps) {
  const filledStars = Math.round(ratingAvg)
  const hasRatings = ratingCount > 0

  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>Ratings &amp; reviews</Text>
      <View style={styles.stars} accessible={false}>
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <Icon
            key={index}
            name="star"
            size={20}
            color={index < filledStars ? COLORS.primary : COLORS.stone}
            filled={index < filledStars}
          />
        ))}
      </View>
      {hasRatings ? (
        <Text style={[TYPE.bodySm, styles.summary]}>
          {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'} ·{' '}
          {ratingAvg.toFixed(1)} / 5
        </Text>
      ) : null}
      <Text style={[TYPE.bodySm, styles.copy]}>
        {hasRatings
          ? 'Written reviews from marketplace buyers will appear here.'
          : 'No reviews yet. Ratings from buyers on your marketplace transactions will show up here.'}
      </Text>
      <Text style={[TYPE.captionSm, styles.note]}>
        Reviews open with the next release.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },
  title: {
    color: COLORS.ink,
  },
  stars: {
    flexDirection: 'row',
    gap: SPACING.xxs,
    marginTop: SPACING.sm,
  },
  summary: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  copy: {
    color: COLORS.body,
    marginTop: SPACING.sm,
  },
  note: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
})

export default ReviewsCard
