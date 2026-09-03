// Full-bleed background band carrying one landing content block. Canvas and
// soft tones alternate down the page per the DESIGN.md surface rhythm.
import { StyleSheet, View } from 'react-native'
import {
  COLORS,
  GUTTER,
  SECTION_VERTICAL_PADDING,
} from '../theme/designTokens.js'

const TONE_STYLES = {
  canvas: { backgroundColor: COLORS.canvas },
  soft: { backgroundColor: COLORS.surfaceSoft },
}

function Section({ tone = 'canvas', children }) {
  return <View style={[styles.section, TONE_STYLES[tone]]}>{children}</View>
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: GUTTER,
    paddingVertical: SECTION_VERTICAL_PADDING,
    alignSelf: 'stretch',
  },
})

export default Section
