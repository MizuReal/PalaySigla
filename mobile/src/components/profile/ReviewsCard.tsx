// Ratings & reviews card — aggregate stars plus the public reviews received by
// the signed-in user, backed by services/reviews.ts under public RLS.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import ReviewItem from './ReviewItem'
import useUserReviews from '../../hooks/useUserReviews'
import { useAuth } from '../../context/authContext'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const MAX_RATING = 5

interface ReviewsCardProps {
  ratingAvg: number
  ratingCount: number
}

function ReviewsCard({ ratingAvg, ratingCount }: ReviewsCardProps) {
  const { user } = useAuth()
  const { reviews, isInitialLoading, error, refresh } = useUserReviews(user?.id ?? null)
  const filledStars = Math.round(ratingAvg)

  const renderList = () => {
    if (isInitialLoading) {
      return <ActivityIndicator color={COLORS.primary} style={styles.spinner} />
    }
    if (error) {
      return (
        <View accessibilityRole="alert">
          <Text style={[TYPE.bodySm, styles.errorText]}>{error}</Text>
          <Text style={[TYPE.bodySm, styles.retry]} onPress={refresh}>
            Try again
          </Text>
        </View>
      )
    }
    if (reviews.length === 0) {
      return (
        <Text style={[TYPE.bodySm, styles.copy]}>
          No reviews yet. Ratings from buyers and sellers you transact with will
          show up here.
        </Text>
      )
    }
    return (
      <View style={styles.list}>
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>Ratings &amp; reviews</Text>
      <View style={styles.summaryRow}>
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
        <Text style={[TYPE.bodyStrong, styles.avg]}>
          {ratingAvg.toFixed(1)}
          <Text style={[TYPE.bodySm, styles.avgSuffix]}> / {MAX_RATING}</Text>
        </Text>
      </View>
      <Text style={[TYPE.captionSm, styles.count]}>
        {ratingCount} rating{ratingCount === 1 ? '' : 's'}
      </Text>
      <View style={styles.divider}>{renderList()}</View>
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  stars: {
    flexDirection: 'row',
    gap: SPACING.xxs,
  },
  avg: {
    color: COLORS.ink,
  },
  avgSuffix: {
    color: COLORS.mute,
  },
  count: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
    marginTop: SPACING.lg,
  },
  list: {
    gap: SPACING.lg,
  },
  spinner: {
    marginVertical: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
  },
  retry: {
    color: COLORS.linkBlue,
    marginTop: SPACING.sm,
  },
  copy: {
    color: COLORS.body,
  },
})

export default ReviewsCard
