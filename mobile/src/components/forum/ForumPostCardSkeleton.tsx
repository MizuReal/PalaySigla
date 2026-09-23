// Feed loading placeholder — a pulsing card with an avatar circle, title bar,
// and two body lines.
import { Animated, StyleSheet, View } from 'react-native'
import usePulseOpacity from '../../hooks/usePulseOpacity'
import { COLORS, RADIUS, SPACING } from '../../theme/designTokens'

const AVATAR_SIZE = 32

function ForumPostCardSkeleton() {
  const opacity = usePulseOpacity()
  return (
    <Animated.View
      accessible
      accessibilityLabel="Loading discussions"
      style={[styles.card, { opacity }]}
    >
      <View style={styles.header}>
        <View style={styles.avatar} />
        <View style={[styles.bar, styles.headerBar]} />
      </View>
      <View style={[styles.bar, styles.titleBar]} />
      <View style={[styles.bar, styles.bodyBar]} />
      <View style={[styles.bar, styles.bodyBarShort]} />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
    alignSelf: 'stretch',
    gap: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceSoft,
  },
  bar: {
    height: 16,
    backgroundColor: COLORS.surfaceSoft,
  },
  headerBar: {
    width: '40%',
  },
  titleBar: {
    width: '75%',
    height: 20,
    marginTop: SPACING.sm,
  },
  bodyBar: {
    width: '100%',
  },
  bodyBarShort: {
    width: '60%',
  },
})

export default ForumPostCardSkeleton
