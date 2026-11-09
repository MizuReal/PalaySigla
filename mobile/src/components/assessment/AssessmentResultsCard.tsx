// Grain assessment result card: the review banner, the photo with flagged
// areas, a verdict that names the coverage band behind it, the two measured
// figures, and a ranked list of the flagged areas. Every number states what it
// measures, so the readout never implies more than the detector can see.
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import DetectionOverlay from './DetectionOverlay'
import type {
  AssessmentData,
  AssessmentQuality,
  AssessmentSeverity,
  DefectDetection,
  SeverityBands,
} from '../../types/api'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const DETECTION_LIMIT = 5
const PERCENT = 100
const COVERAGE_DECIMALS = 2
const BADGE_SIZE = 20
const BAR_HEIGHT = 4

const QUALITY_LABELS: Record<AssessmentQuality, string> = {
  premium: 'Premium',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

const OUTPUT_LABELS: Record<string, string> = {
  market_grade: 'Market grade',
  variety: 'Variety',
}

const EMPTY_MESSAGE = 'No mold or discoloration detected in this sample.'
const QUALITY_LABEL = 'Quality status'
const FLAGGED_AREAS_LABEL = 'Flagged areas'
const COVERAGE_LABEL = 'Photo coverage'
const LOW_CONFIDENCE_LABEL = 'Low confidence'
const LOCATE_HINT = 'Tap an area below to locate it on the photo.'
const COVERAGE_DEFINITION =
  'Coverage is the share of the photo inside the flagged areas \u2014 not the share of grains affected.'

interface AssessmentResultsCardProps {
  data: AssessmentData
  imageUri: string
  imageWidth: number
  imageHeight: number
  onRetake: () => void
}

function formatConfidence(value: number): `${number}%` {
  return `${Math.round(value * PERCENT)}%` as `${number}%`
}

function formatCoverage(value: number): `${number}%` {
  return `${(value * PERCENT).toFixed(COVERAGE_DECIMALS)}%` as `${number}%`
}

function severityLine(severity: AssessmentSeverity, bands: SeverityBands): string {
  const none = formatCoverage(bands.none_max)
  const low = formatCoverage(bands.low_max)
  const moderate = formatCoverage(bands.moderate_max)
  const lines: Record<AssessmentSeverity, string> = {
    none: `Clear coverage \u2014 ${none} or less.`,
    low: `Low severity \u2014 ${none} to ${low} coverage.`,
    moderate: `Moderate severity \u2014 ${low} to ${moderate} coverage.`,
    high: `High severity \u2014 above ${moderate} coverage.`,
  }
  return lines[severity]
}

function bannerMessage(detections: DefectDetection[], threshold: number): string {
  const total = detections.length
  if (total === 0) {
    return EMPTY_MESSAGE
  }
  const flagged = detections.filter((detection) => detection.needs_review).length
  const thresholdPercent = formatConfidence(threshold)
  if (flagged === 0) {
    const verb = total === 1 ? 'area passes' : 'areas pass'
    return `All ${total} flagged ${verb} the ${thresholdPercent} confidence threshold.`
  }
  const subject = total === 1 ? 'area falls' : 'areas fall'
  const pronoun = flagged === 1 ? 'it' : 'them'
  return `${flagged} of ${total} flagged ${subject} below ${thresholdPercent} confidence. Check ${pronoun} before using this result.`
}

function detectionAccessibilityLabel(detection: DefectDetection, position: number): string {
  const parts = [
    `Area ${position + 1}`,
    detection.label,
    `${formatConfidence(detection.confidence)} confidence`,
  ]
  if (detection.needs_review) {
    parts.push('flagged for review')
  }
  return parts.join(', ')
}

function hiddenNote(count: number): string {
  return `${count} more flagged ${count === 1 ? 'area' : 'areas'} outlined above.`
}

function AssessmentResultsCard({
  data,
  imageUri,
  imageWidth,
  imageHeight,
  onRetake,
}: AssessmentResultsCardProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const ranked = useMemo(
    () => [...data.detections].sort((left, right) => right.confidence - left.confidence),
    [data.detections]
  )
  const shown = ranked.slice(0, DETECTION_LIMIT)
  const hidden = ranked.length - shown.length
  const highlightIndex = selectedIndex < shown.length ? selectedIndex : null

  return (
    <View style={styles.card}>
      <View style={[styles.banner, data.needs_review ? styles.bannerReview : styles.bannerClean]}>
        <Text style={[TYPE.bodySm, styles.bannerText]}>
          {bannerMessage(data.detections, data.review_confidence_threshold)}
        </Text>
      </View>

      <View style={styles.photo}>
        <DetectionOverlay
          imageUri={imageUri}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          detections={ranked}
          highlightIndex={highlightIndex}
        />
        {shown.length > 0 ? (
          <Text style={[TYPE.captionSm, styles.photoHint]}>{LOCATE_HINT}</Text>
        ) : null}
      </View>

      <View style={styles.verdict}>
        <Text style={[TYPE.captionMd, styles.verdictEyebrow]}>{QUALITY_LABEL}</Text>
        <Text style={[TYPE.headingMd, styles.verdictValue]}>
          {QUALITY_LABELS[data.quality_status]}
        </Text>
        <Text style={[TYPE.bodySm, styles.verdictDetail]}>
          {severityLine(data.severity, data.severity_bands)}
        </Text>
      </View>

      <View style={styles.measurements}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[TYPE.headingMd, styles.statValue]} testID="stat-flagged-areas">
              {ranked.length}
            </Text>
            <Text style={[TYPE.captionSm, styles.statLabel]}>{FLAGGED_AREAS_LABEL}</Text>
          </View>
          <View style={[styles.stat, styles.statRight]}>
            <Text style={[TYPE.headingMd, styles.statValue]} testID="stat-coverage">
              {formatCoverage(data.defect_rate)}
            </Text>
            <Text style={[TYPE.captionSm, styles.statLabel]}>{COVERAGE_LABEL}</Text>
          </View>
        </View>
        <Text style={[TYPE.captionSm, styles.definition]}>{COVERAGE_DEFINITION}</Text>
      </View>

      {shown.length > 0 ? (
        <View style={styles.detections}>
          {shown.map((detection, index) => {
            const isSelected = index === selectedIndex
            return (
              <Pressable
                key={`${detection.class_key}-${index}`}
                onPress={() => setSelectedIndex(index)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={detectionAccessibilityLabel(detection, index)}
                style={[styles.detectionRow, isSelected && styles.detectionRowSelected]}
              >
                <View style={styles.detectionHeader}>
                  <View style={[styles.badge, isSelected && styles.badgeSelected]}>
                    <Text
                      style={[
                        TYPE.captionXs,
                        styles.badgeText,
                        isSelected && styles.badgeTextSelected,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[TYPE.bodySm, styles.detectionLabel]} numberOfLines={1}>
                    {detection.label}
                  </Text>
                  <Text style={[TYPE.bodyStrong, styles.detectionConfidence]}>
                    {formatConfidence(detection.confidence)}
                  </Text>
                </View>
                <View style={styles.detectionMeta}>
                  {detection.needs_review ? (
                    <View style={styles.reviewChip}>
                      <Text style={[TYPE.captionSm, styles.reviewChipText]}>
                        {LOW_CONFIDENCE_LABEL}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.track}>
                    <View
                      style={[styles.fill, { width: formatConfidence(detection.confidence) }]}
                    />
                  </View>
                </View>
              </Pressable>
            )
          })}
          {hidden > 0 ? (
            <Text style={[TYPE.captionSm, styles.more]}>{hiddenNote(hidden)}</Text>
          ) : null}
        </View>
      ) : null}

      {data.unavailable_outputs.length > 0 ? (
        <View style={styles.notice}>
          <Text style={[TYPE.captionSm, styles.noticeText]}>
            Not available from this model yet:{' '}
            {data.unavailable_outputs.map((key) => OUTPUT_LABELS[key] ?? key).join(', ')}.
          </Text>
        </View>
      ) : null}

      <View style={styles.action}>
        <Button label="Assess another photo" onPress={onRetake} fullWidth />
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
  photo: {
    padding: SPACING.lg,
  },
  photoHint: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  verdict: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xxs,
  },
  verdictEyebrow: {
    color: COLORS.mute,
  },
  verdictValue: {
    color: COLORS.ink,
  },
  verdictDetail: {
    color: COLORS.body,
  },
  measurements: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    gap: SPACING.xxs,
  },
  statRight: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.hairline,
  },
  statValue: {
    color: COLORS.ink,
  },
  statLabel: {
    color: COLORS.mute,
  },
  definition: {
    color: COLORS.mute,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.xs,
  },
  detections: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingVertical: SPACING.xs,
  },
  detectionRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.xs,
  },
  detectionRowSelected: {
    backgroundColor: COLORS.surfaceSoft,
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
  },
  badgeSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  badgeText: {
    color: COLORS.body,
  },
  badgeTextSelected: {
    color: COLORS.onPrimary,
  },
  detectionLabel: {
    color: COLORS.body,
    flex: 1,
  },
  detectionConfidence: {
    color: COLORS.ink,
  },
  detectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  reviewChip: {
    backgroundColor: COLORS.accentYellowPale,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  reviewChipText: {
    color: COLORS.ink,
  },
  track: {
    flex: 1,
    height: BAR_HEIGHT,
    backgroundColor: COLORS.hairline,
  },
  fill: {
    height: BAR_HEIGHT,
    backgroundColor: COLORS.primary,
  },
  more: {
    color: COLORS.mute,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  notice: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  noticeText: {
    color: COLORS.mute,
  },
  action: {
    padding: SPACING.lg,
  },
})

export default AssessmentResultsCard
