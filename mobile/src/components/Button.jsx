// Primary action button per the DESIGN.md button-primary treatment:
// `{colors.primary}` fill, `{colors.onPrimary}` text, 44px height, 2px
// radius, pressed state dropping to `{colors.primary-dark}`.
//
// `large` scales the button to the landing entry treatment documented in the
// DESIGN.md mobile notes: 56px tall with `{typography.button-lg}`. `fullWidth`
// stretches it across its parent so the entry action reads as the page's
// single obvious action.
import { Pressable, StyleSheet, Text } from 'react-native'
import { COLORS, RADIUS, SPACING, TYPE } from '../theme/designTokens.js'

// Landing entry CTA height (DESIGN.md mobile notes — no token added)
const ENTRY_BUTTON_HEIGHT = 56

function Button({
  label,
  onPress,
  accessibilityLabel,
  large = false,
  fullWidth = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.button,
        large && styles.buttonLarge,
        fullWidth && styles.buttonFullWidth,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[TYPE.buttonMd, large && TYPE.buttonLg, styles.label]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'flex-start',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
  },
  buttonLarge: {
    minHeight: ENTRY_BUTTON_HEIGHT,
  },
  buttonFullWidth: {
    alignSelf: 'stretch',
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  label: {
    color: COLORS.onPrimary,
  },
})

export default Button
