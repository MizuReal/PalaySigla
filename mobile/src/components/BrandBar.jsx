// Top chrome strip: the green brand square + wordmark on canvas with a
// hairline rule, matching the light-only deviation (no dark nav). Auth links
// and anchor navigation are absent until real flows exist.
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, GUTTER, SPACING, TYPE } from '../theme/designTokens.js'

function BrandBar() {
  const insets = useSafeAreaInsets()
  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.md },
      ]}
    >
      <View style={styles.brand} accessibilityLabel="PalaySigla">
        <View style={styles.brandSquare} accessible={false} />
        <Text style={[TYPE.bodyStrong, styles.brandName]}>PalaySigla</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.canvas,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingHorizontal: GUTTER,
    alignSelf: 'stretch',
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
})

export default BrandBar
