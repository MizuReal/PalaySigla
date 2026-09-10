// Eyebrow + display heading + supporting copy block that opens every landing
// section, mirroring the website SectionHeader component.
import { StyleSheet, Text, View } from 'react-native'
import { COLORS, SPACING, TYPE } from '../theme/designTokens'

interface SectionHeaderProps {
  eyebrow: string
  title: string
  sub?: string
}

function SectionHeader({ eyebrow, title, sub }: SectionHeaderProps) {
  return (
    <View style={styles.header}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>{eyebrow}</Text>
      <Text style={[TYPE.displayLg, styles.title]}>{title}</Text>
      {sub ? <Text style={[TYPE.bodyMd, styles.sub]}>{sub}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: SPACING.xxl,
  },
  eyebrow: {
    color: COLORS.mute,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.md,
  },
  sub: {
    color: COLORS.body,
    marginTop: SPACING.lg,
  },
})

export default SectionHeader
