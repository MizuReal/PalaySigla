// Two benefit cards — one for mill owners, one for farmers — with green
// check bullets. Mirror of the website AudienceSection.
import { StyleSheet, Text, View } from 'react-native'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'
import Icon from '../Icon.jsx'
import { COLORS, CARD_GAP, SPACING, TYPE } from '../../theme/designTokens.js'

const MILL_BENEFITS = [
  'Consistent grading at intake — the same standard for every supplier, every sack',
  'Mold caught before it ever reaches a bin',
  'Batch-level records for buying, pricing, and audits',
  'Fewer disputes — results both sides can see',
]

const FARMER_BENEFITS = [
  'Know your palay\u2019s quality before you sell',
  'Fairer pricing with objective evidence in hand',
  'Mold spotted early so it never spreads to the good palay',
  'Variety confirmed right at the farm gate',
]

const AUDIENCES = [
  { icon: 'shield', title: 'For rice mill owners', benefits: MILL_BENEFITS },
  { icon: 'scale', title: 'For rice farmers', benefits: FARMER_BENEFITS },
]

function BenefitCard({ audience }) {
  return (
    <View style={styles.card}>
      <Icon name={audience.icon} />
      <Text style={[TYPE.headingXl, styles.cardTitle]}>{audience.title}</Text>
      <View style={styles.benefitList}>
        {audience.benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitRow}>
            <View style={styles.benefitCheck}>
              <Icon name="check" size={20} />
            </View>
            <Text style={[TYPE.bodyMd, styles.benefitText]}>{benefit}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function AudienceSection() {
  return (
    <Section tone="canvas">
      <SectionHeader
        eyebrow="Built for both sides of the scale"
        title="Fair for the farmer. Precise for the mill."
        sub="One scan, one set of numbers both sides can trust — that is how harvests get priced fairly and mills keep their quality promise."
      />
      <View style={styles.cards}>
        {AUDIENCES.map((audience) => (
          <BenefitCard key={audience.title} audience={audience} />
        ))}
      </View>
    </Section>
  )
}

const styles = StyleSheet.create({
  cards: {
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
  benefitList: {
    marginTop: SPACING.xl,
    gap: SPACING.lg,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  benefitCheck: {
    marginTop: SPACING.xxs,
  },
  benefitText: {
    color: COLORS.body,
    flex: 1,
  },
})

export default AudienceSection
