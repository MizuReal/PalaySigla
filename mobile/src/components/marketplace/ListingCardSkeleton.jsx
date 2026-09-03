// Card-shaped loading placeholder for the feed: a 4:3 soft block plus three
// text bars, all breathing on the shared pulse so the initial load reads as
// "content is coming" rather than as an empty screen.
import { Animated, StyleSheet, View } from 'react-native'
import usePulseOpacity from '../../hooks/usePulseOpacity.js'
import { COLORS, SPACING } from '../../theme/designTokens.js'

function ListingCardSkeleton() {
  const opacity = usePulseOpacity()
  return (
    <Animated.View
      accessible
      accessibilityLabel="Loading listings"
      style={[styles.card, { opacity }]}
    >
      <View style={styles.photo} />
      <View style={styles.body}>
        <View style={[styles.bar, styles.titleBar]} />
        <View style={[styles.bar, styles.priceBar]} />
        <View style={[styles.bar, styles.locationBar]} />
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    alignSelf: 'stretch',
  },
  photo: {
    aspectRatio: 4 / 3,
    backgroundColor: COLORS.surfaceSoft,
  },
  body: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  bar: {
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
  titleBar: {
    height: 20,
    width: '75%',
  },
  priceBar: {
    width: '35%',
  },
  locationBar: {
    width: '60%',
  },
})

export default ListingCardSkeleton
