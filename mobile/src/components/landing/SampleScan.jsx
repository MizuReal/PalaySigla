// Sample scan readout card: paddy photo beside four static result rows with
// confidence bars. Confidence values are illustrative UI content, not
// measured data, mirroring the website's OutputMockup section.
import { Image, StyleSheet, Text, View } from 'react-native'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'
import Icon from '../Icon.jsx'
import { GOLDEN_PADDY_IMAGE } from '../../data/paddySlides.js'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens.js'

const PHOTO_ASPECT_RATIO = 4 / 3

const SAMPLE_RESULTS = [
  { icon: 'quality', label: 'Quality status', value: 'Dry · Clean', confidence: 96 },
  { icon: 'mold', label: 'Mold', value: 'None detected', confidence: 94 },
  { icon: 'grade', label: 'Market grade', value: 'Grade A', confidence: 91 },
  { icon: 'variety', label: 'Variety', value: 'NSIC RC 222', confidence: 89 },
]

function ResultRow({ result }) {
  return (
    <View>
      <View style={styles.resultHeader}>
        <View style={styles.resultLabelBlock}>
          <Icon name={result.icon} size={20} />
          <View style={styles.resultLabelCopy}>
            <Text style={[TYPE.captionSm, styles.resultLabel]}>
              {result.label}
            </Text>
            <Text style={[TYPE.bodyStrong, styles.resultValue]}>
              {result.value}
            </Text>
          </View>
        </View>
        <Text style={[TYPE.bodyStrong, styles.resultConfidence]}>
          {result.confidence}%
        </Text>
      </View>
      <View style={styles.confidenceTrack}>
        {/* width is dynamic per confidence score, hence the inline style */}
        <View style={[styles.confidenceFill, { width: `${result.confidence}%` }]} />
      </View>
    </View>
  )
}

function SampleScan() {
  return (
    <Section tone="canvas">
      <SectionHeader
        eyebrow="One photo. Four answers."
        title="This is what a PalaySigla scan looks like."
        sub={'All four checks run on the same image, in the same request, so the results always agree with each other — and every result ships with a per-class confidence score.'}
      />
      <View style={styles.card}>
        <View style={styles.photoPanel}>
          <Image
            source={{ uri: GOLDEN_PADDY_IMAGE }}
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel="Close-up of golden unhulled paddy grains used in a sample scan"
          />
          <View style={styles.badge}>
            <Text style={[TYPE.captionMd, styles.badgeText]}>Sample scan</Text>
          </View>
        </View>
        <View style={styles.resultsPanel}>
          {SAMPLE_RESULTS.map((result) => (
            <ResultRow key={result.label} result={result} />
          ))}
          <Text style={[TYPE.captionSm, styles.disclaimer]}>
            Sample result for illustration. Every scan is stored in your
            record.
          </Text>
        </View>
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  photoPanel: {
    padding: SPACING.lg,
  },
  photo: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT_RATIO,
    backgroundColor: COLORS.surfaceSoft,
  },
  badge: {
    position: 'absolute',
    top: SPACING.lg + SPACING.sm,
    left: SPACING.lg + SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md - 2,
    paddingVertical: SPACING.xs,
  },
  badgeText: {
    color: COLORS.body,
  },
  resultsPanel: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    padding: SPACING.xl,
    gap: SPACING.lg + SPACING.xs,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  resultLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  resultLabelCopy: {
    flex: 1,
  },
  resultLabel: {
    color: COLORS.mute,
  },
  resultValue: {
    color: COLORS.ink,
  },
  resultConfidence: {
    color: COLORS.primary,
  },
  confidenceTrack: {
    marginLeft: SPACING.xxl,
    marginTop: SPACING.sm,
    height: 6,
    backgroundColor: COLORS.hairline,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  disclaimer: {
    color: COLORS.mute,
  },
})

export default SampleScan
