// Shared "designed placeholder" panel for tabs whose flows have not shipped
// yet: honest copy (no fake data, no dead controls) styled with existing
// primitives — SectionHeader treatment, a hairline benefit card, and a
// badge-tag "Next phase" chip. Real flows replace the panel phase by phase.
import { StyleSheet, Text, View } from 'react-native'
import { COLORS, GUTTER, SPACING, TYPE } from '../theme/designTokens.js'

function FeatureNotice({ eyebrow, title, sub, points, status }) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>{eyebrow}</Text>
      <Text style={[TYPE.displayLg, styles.title]}>{title}</Text>
      {sub ? <Text style={[TYPE.bodyMd, styles.sub]}>{sub}</Text> : null}
      <View style={styles.card}>
        <View style={styles.chip}>
          <Text style={[TYPE.captionMd, styles.chipText]}>Next phase</Text>
        </View>
        <View style={styles.pointList}>
          {points.map((point) => (
            <Text key={point} style={[TYPE.bodyMd, styles.point]}>
              {'\u2022'} {point}
            </Text>
          ))}
        </View>
      </View>
      <Text style={[TYPE.captionSm, styles.status]}>{status}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignSelf: 'stretch',
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
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.body,
  },
  pointList: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  point: {
    color: COLORS.body,
  },
  status: {
    color: COLORS.mute,
    marginTop: SPACING.xl,
  },
})

export default FeatureNotice
