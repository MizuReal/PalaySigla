// Three numbered steps on a soft band. Mirror of the website HowItWorks
// section, minus the anchor navigation.
import { StyleSheet, Text, View } from 'react-native'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'
import Icon from '../Icon.jsx'
import { COLORS, CARD_GAP, SPACING, TYPE } from '../../theme/designTokens.js'

const STEPS = [
  {
    icon: 'camera',
    title: 'Take a photo',
    body: 'Capture the palay with your phone or upload it on the web. No setup, no lab, no technician needed.',
  },
  {
    icon: 'scan',
    title: 'Scan & classify',
    body: 'The model reads quality status, mold, market grade, and variety from the same image, with confidence scores on every result.',
  },
  {
    icon: 'check',
    title: 'Decide with confidence',
    body: 'Use the results at intake, pricing, or sorting. Every scan is kept on record for your audit trail.',
  },
]

function StepCard({ step, index }) {
  return (
    <View style={styles.card}>
      <Icon name={step.icon} />
      <Text style={[TYPE.captionMd, styles.stepLabel]}>Step {index + 1}</Text>
      <Text style={[TYPE.headingMd, styles.stepTitle]}>{step.title}</Text>
      <Text style={[TYPE.bodyMd, styles.stepBody]}>{step.body}</Text>
    </View>
  )
}

function HowItWorks() {
  return (
    <Section tone="soft">
      <SectionHeader
        eyebrow="How it works"
        title="Three steps, zero guesswork"
        sub="From a handful of palay to a full quality readout in the time it takes to read this sentence."
      />
      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <StepCard key={step.title} step={step} index={index} />
        ))}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  steps: {
    gap: CARD_GAP,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  stepLabel: {
    color: COLORS.mute,
    marginTop: SPACING.xl,
  },
  stepTitle: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  stepBody: {
    color: COLORS.body,
    marginTop: SPACING.md,
  },
})

export default HowItWorks
