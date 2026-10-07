// Editable OCR result card: every field with its confidence, the derived
// length/width ratio, and an overall review banner. Values are corrections
// only in this phase — saving arrives with the assessment phase.
import { StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import ScanFieldRow from './ScanFieldRow'
import type { ScanFieldResult } from '../../types/api'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const CLEAN_MESSAGE = 'All six values read cleanly.'
const REVIEW_MESSAGE = 'Some values need your review. Check the flagged fields.'
const COMPUTED_RATIO_LABEL = 'Length \u00f7 width'
const RATIO_DECIMALS = 2

interface ScanResultsCardProps {
  fields: ScanFieldResult[]
  computedRatio: number | null
  overallNeedsReview: boolean
  onChangeValue: (key: string, value: number | null) => void
  onRetake: () => void
}

function ScanResultsCard({
  fields,
  computedRatio,
  overallNeedsReview,
  onChangeValue,
  onRetake,
}: ScanResultsCardProps) {
  return (
    <View style={styles.card}>
      <View
        style={[styles.banner, overallNeedsReview ? styles.bannerReview : styles.bannerClean]}
      >
        <Text style={[TYPE.bodySm, styles.bannerText]}>
          {overallNeedsReview ? REVIEW_MESSAGE : CLEAN_MESSAGE}
        </Text>
      </View>
      {fields.map((field) => (
        <ScanFieldRow key={field.key} field={field} onChange={onChangeValue} />
      ))}
      {computedRatio !== null ? (
        <View style={styles.computedRow}>
          <Text style={[TYPE.captionSm, styles.computedLabel]}>{COMPUTED_RATIO_LABEL}</Text>
          <Text style={[TYPE.bodyStrong, styles.computedValue]}>
            {computedRatio.toFixed(RATIO_DECIMALS)}
          </Text>
        </View>
      ) : null}
      <View style={styles.action}>
        <Button label="Scan another sheet" onPress={onRetake} fullWidth />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  banner: {
    borderBottomWidth: 1,
    padding: SPACING.lg,
  },
  bannerReview: {
    borderBottomColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
  },
  bannerClean: {
    borderBottomColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  bannerText: {
    color: COLORS.body,
  },
  computedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceSoft,
  },
  computedLabel: {
    color: COLORS.mute,
  },
  computedValue: {
    color: COLORS.ink,
  },
  action: {
    padding: SPACING.lg,
  },
})

export default ScanResultsCard
