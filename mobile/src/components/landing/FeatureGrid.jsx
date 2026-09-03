// Feature cards: one icon + heading + body per scan output, in a single
// column on phones. Mirror of the website FeatureGrid section.
import { StyleSheet, Text, View } from 'react-native'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'
import Icon from '../Icon.jsx'
import { COLORS, CARD_GAP, SPACING, TYPE } from '../../theme/designTokens.js'

const FEATURES = [
  {
    icon: 'quality',
    title: 'Quality status',
    body: 'Fresh, dry, or already deteriorating — PalaySigla reads the state of your palay at harvest and flags what needs attention before it costs you.',
  },
  {
    icon: 'mold',
    title: 'Mold detection',
    body: 'Spot fungal growth early. Catching it at the gate protects the batch, the mill, and the price you can still command.',
  },
  {
    icon: 'grade',
    title: 'Market grade',
    body: 'Automatic grade classification, consistent from one sack to the next. No more arguing over which bin the palay belongs in.',
  },
  {
    icon: 'variety',
    title: 'Variety classification',
    body: 'Know the variety in the photo instantly, so mixed or swapped lots are caught at intake instead of after milling.',
  },
]

function FeatureCard({ feature }) {
  return (
    <View style={styles.card}>
      <Icon name={feature.icon} />
      <Text style={[TYPE.headingMd, styles.cardTitle]}>{feature.title}</Text>
      <Text style={[TYPE.bodyMd, styles.cardBody]}>{feature.body}</Text>
    </View>
  )
}

function FeatureGrid() {
  return (
    <Section tone="canvas">
      <SectionHeader
        eyebrow="What it checks"
        title="Four answers from one photo"
        sub="Every scan runs the same image through all four checks at once, so the results always agree with each other — and every result ships with per-class confidence scores."
      />
      <View style={styles.grid}>
        {FEATURES.map((feature) => (
          <FeatureCard key={feature.title} feature={feature} />
        ))}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  grid: {
    gap: CARD_GAP,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  cardTitle: {
    color: COLORS.ink,
    marginTop: SPACING.xl,
  },
  cardBody: {
    color: COLORS.body,
    marginTop: SPACING.md,
  },
})

export default FeatureGrid
