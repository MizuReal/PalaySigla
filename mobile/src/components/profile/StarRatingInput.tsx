import { Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import { MAX_RATING } from '../../services/reviews'
import { COLORS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

// Interactive 1–5 star control; each star is a 44px touch target.
function StarRatingInput({ value, onChange, disabled = false }: StarRatingInputProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Rating"
      accessibilityValue={{ min: 1, max: MAX_RATING, now: value }}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const rating = index + 1
        const isFilled = rating <= value
        return (
          <Pressable
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={`${rating} star${rating === 1 ? '' : 's'}`}
            accessibilityState={{ disabled, selected: value === rating }}
            disabled={disabled}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [styles.star, (pressed || disabled) && styles.dim]}
          >
            <Icon
              name="star"
              size={30}
              color={isFilled ? COLORS.primary : COLORS.stone}
              filled={isFilled}
            />
          </Pressable>
        )
      })}
      <Text style={[TYPE.captionMd, styles.ratio]}>
        {value > 0 ? `${value} / ${MAX_RATING}` : `0 / ${MAX_RATING}`}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  star: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: {
    opacity: 0.6,
  },
  ratio: {
    color: COLORS.ink,
    marginLeft: SPACING.sm,
  },
})

export default StarRatingInput
