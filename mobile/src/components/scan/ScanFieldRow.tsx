// One editable scan field: label + unit, the recognized value input, the
// per-field confidence bar, and a review chip when the digit model or the
// range check was not confident.
import { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import type { ScanFieldResult } from '../../types/api'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const CONFIDENCE_BAR_HEIGHT = 6
const REVIEW_LABEL = 'Review'
const EMPTY_PLACEHOLDER = '—'

interface ScanFieldRowProps {
  field: ScanFieldResult
  onChange: (key: string, value: number | null) => void
}

function ScanFieldRow({ field, onChange }: ScanFieldRowProps) {
  // The local draft keeps half-typed decimals (e.g. "7.") intact; fields are
  // remounted per scan, so the parent never needs to push values back in.
  const [text, setText] = useState(field.value === null ? '' : String(field.value))
  const [isFocused, setIsFocused] = useState(false)

  const handleChange = (next: string) => {
    setText(next)
    const normalized = next.trim().replace(',', '.')
    if (normalized === '') {
      onChange(field.key, null)
      return
    }
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) {
      onChange(field.key, parsed)
    }
  }

  const confidencePercent = Math.round(field.confidence * 100)
  const accessibilityLabel = field.unit
    ? `${field.label} in ${field.unit}`
    : field.label

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <View style={styles.labelBlock}>
          <View style={styles.labelLine}>
            <Text style={[TYPE.bodyStrong, styles.label]}>{field.label}</Text>
            {field.unit ? (
              <Text style={[TYPE.captionSm, styles.unit]}>{field.unit}</Text>
            ) : null}
          </View>
          {field.needs_review ? (
            <View style={styles.reviewChip}>
              <Text style={[TYPE.captionSm, styles.reviewChipText]}>{REVIEW_LABEL}</Text>
            </View>
          ) : null}
        </View>
        <TextInput
          value={text}
          onChangeText={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          keyboardType="decimal-pad"
          placeholder={EMPTY_PLACEHOLDER}
          placeholderTextColor={COLORS.ash}
          accessibilityLabel={accessibilityLabel}
          style={[
            TYPE.bodyStrong,
            styles.input,
            isFocused && styles.inputFocused,
            !isFocused && field.needs_review && styles.inputReview,
          ]}
        />
      </View>
      <View style={styles.confidenceRow}>
        <View style={styles.confidenceTrack}>
          {/* width is the confidence score, so it stays an inline style */}
          <View style={[styles.confidenceFill, { width: `${confidencePercent}%` }]} />
        </View>
        <Text style={[TYPE.captionSm, styles.confidenceText]}>{confidencePercent}%</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingVertical: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  labelBlock: {
    flex: 1,
    gap: SPACING.xs,
  },
  labelLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.ink,
  },
  unit: {
    color: COLORS.mute,
  },
  reviewChip: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentYellowPale,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  reviewChipText: {
    color: COLORS.ink,
  },
  input: {
    minWidth: 96,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    color: COLORS.ink,
    textAlign: 'right',
    paddingHorizontal: SPACING.md,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  inputReview: {
    borderColor: COLORS.error,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  confidenceTrack: {
    flex: 1,
    height: CONFIDENCE_BAR_HEIGHT,
    backgroundColor: COLORS.hairline,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  confidenceText: {
    color: COLORS.mute,
  },
})

export default ScanFieldRow
