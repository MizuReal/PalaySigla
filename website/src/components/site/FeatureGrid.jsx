import Icon from '../Icon.jsx'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'

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

function FeatureGrid() {
  return (
    <Section id="features">
      <SectionHeader
        eyebrow="What it checks"
        title="Four answers from one photo"
        sub="Every scan runs the same image through all four checks at once, so the results always agree with each other — and every result ships with per-class confidence scores."
      />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="border border-hairline p-8">
            <Icon name={feature.icon} className="h-6 w-6 text-primary" />
            <h3 className="heading-md mt-6 text-ink">{feature.title}</h3>
            <p className="body-md mt-3 text-body">{feature.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export default FeatureGrid
