// Landing footer: brand blurb + legal fine print on a soft band. Link
// columns are omitted — every footer link on the website anchors to sections
// that would be dead taps inside one scrolling screen.
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, GUTTER, SPACING, TYPE } from '../../theme/designTokens.js'

function LandingFooter() {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
      ]}
    >
      <View style={styles.brand} accessibilityLabel="PalaySigla">
        <View style={styles.brandSquare} accessible={false} />
        <Text style={[TYPE.bodyStrong, styles.brandName]}>PalaySigla</Text>
      </View>
      <Text style={[TYPE.bodySm, styles.blurb]}>
        Real-time, image-based quality monitoring for post-harvest paddy —
        built for rice mills and farmers across the Philippines.
      </Text>
      <View style={styles.divider} />
      <Text style={[TYPE.utilityXs, styles.legal]}>
        © 2026 PalaySigla — post-harvest paddy quality monitoring
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  footer: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surfaceSoft,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    alignSelf: 'flex-start',
  },
  brandSquare: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.primary,
  },
  brandName: {
    color: COLORS.ink,
  },
  blurb: {
    color: COLORS.mute,
    marginTop: SPACING.lg,
    maxWidth: 360,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xl,
  },
  legal: {
    color: COLORS.mute,
  },
})

export default LandingFooter
