// Grain assessment result card: the review banner, the photo with detected
// defects outlined, the derived defect rate/severity/quality readout, and the
// per-detection confidences. Outputs the model cannot produce yet are stated
// explicitly rather than silently omitted.
import { StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import DetectionOverlay from './DetectionOverlay'
import type { AssessmentData, AssessmentSeverity, DefectDetection } from '../../types/api'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const CLEAN_MESSAGE = 'No defects needed review on this sample.'
const REVIEW_MESSAGE = 'Some detections are low-confidence. Check the outlined grains.'
const DETECTION_LIMIT = 5
const PERCENT = 100
const DECIMALS = 1

const SEVERITY_LABELS: Record<AssessmentSeverity, string> = {
  none: 'None detected',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
}

const OUTPUT_LABELS: Record<string, string> = {
  market_grade: 'Market grade',
  variety: 'Variety',
}

interface AssessmentResultsCardProps {
  data: AssessmentData
  imageUri: string
  imageWidth: number
  imageHeight: number
  onRetake: () => void
}

function formatPercent(value: number): `${number}%` {
  return `${(value * PERCENT).toFixed(DECIMALS)}%` as `${number}%`
}

function formatLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[TYPE.captionSm, styles.summaryLabel]}>{label}</Text>
      <Text style={[TYPE.bodyStrong, styles.summaryValue]}>{value}</Text>
    </View>
  )
}

function DetectionRow({ detection }: { detection: DefectDetection }) {
  return (
    <View style={styles.detectionRow}>
      <View style={styles.detectionHeader}>
        <Text style={[TYPE.bodySm, styles.detectionLabel]}>{detection.label}</Text>
        <Text style={[TYPE.bodyStrong, styles.detectionConfidence]}>
          {formatPercent(detection.confidence)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: formatPercent(detection.confidence) }]} />
      </View>
    </View>
  )
}

function AssessmentResultsCard({
  data,
  imageUri,
  imageWidth,
  imageHeight,
  onRetake,
}: AssessmentResultsCardProps) {
  const total = Object.values(data.counts).reduce((sum, count) => sum + count, 0)
  const shown = data.detections.slice(0, DETECTION_LIMIT)
  const hidden = data.detections.length - shown.length

  return (
    <View style={styles.card}>
      <View style={[styles.banner, data.needs_review ? styles.bannerReview : styles.bannerClean]}>
        <Text style={[TYPE.bodySm, styles.bannerText]}>
          {data.needs_review ? REVIEW_MESSAGE : CLEAN_MESSAGE}
        </Text>
      </View>

      <View style={styles.photo}>
        <DetectionOverlay
          imageUri={imageUri}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          detections={data.detections}
        />
      </View>

      <View style={styles.summary}>
        <SummaryRow label="Defects found" value={String(total)} />
        <SummaryRow label="Defect area" value={formatPercent(data.defect_rate)} />
        <SummaryRow label="Severity" value={SEVERITY_LABELS[data.severity]} />
        <SummaryRow label="Quality status" value={formatLabel(data.quality_status)} />
      </View>

      {shown.length > 0 ? (
        <View style={styles.detections}>
          {shown.map((detection, index) => (
            <DetectionRow key={`${detection.class_key}-${index}`} detection={detection} />
          ))}
          {hidden > 0 ? (
            <Text style={[TYPE.captionSm, styles.more]}>
              and {hidden} more on the photo
            </Text>
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
  summary: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    gap: SPACING.md,
  },
  summaryLabel: {
    color: COLORS.mute,
  },
  summaryValue: {
    color: COLORS.ink,
  },
  detections: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  detectionRow: {
    gap: SPACING.xs,
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  detectionLabel: {
    color: COLORS.body,
    flex: 1,
  },
  detectionConfidence: {
    color: COLORS.ink,
  },
  track: {
    height: 4,
    backgroundColor: COLORS.surfaceSoft,
  },
  fill: {
    height: 4,
    backgroundColor: COLORS.primary,
  },
  more: {
    color: COLORS.mute,
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
