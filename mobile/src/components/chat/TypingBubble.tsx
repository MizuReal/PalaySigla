// Shared three-dot typing bubble for every assistant surface.
import { Animated, StyleSheet, View } from 'react-native'
import usePulseOpacity from '../../hooks/usePulseOpacity'
import { COLORS, RADIUS, SPACING } from '../../theme/designTokens'

const TYPING_DOT_SIZE = 6

function TypingDot() {
  const opacity = usePulseOpacity()
  return <Animated.View style={[styles.dot, { opacity }]} />
}

function TypingBubble() {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLabel="The assistant is typing"
      style={styles.bubble}
    >
      <TypingDot />
      <TypingDot />
      <TypingDot />
    </View>
  )
}

const styles = StyleSheet.create({
  bubble: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  dot: {
    width: TYPING_DOT_SIZE,
    height: TYPING_DOT_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mute,
  },
})

export default TypingBubble
