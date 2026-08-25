import Icon from '../Icon.jsx'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'

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

function BenefitCard({ title, icon, benefits }) {
  return (
    <div className="border border-hairline p-8 sm:p-12">
      <Icon name={icon} className="h-6 w-6 text-primary" />
      <h3 className="heading-xl mt-6 text-ink">{title}</h3>
      <ul className="mt-6 space-y-4">
        {benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-primary" />
            <span className="body-md text-body">{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AudienceSection() {
  return (
    <Section id="audience">
      <SectionHeader
        eyebrow="Built for both sides of the scale"
        title="Fair for the farmer. Precise for the mill."
        sub="One scan, one set of numbers both sides can trust — that is how harvests get priced fairly and mills keep their quality promise."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BenefitCard
          icon="shield"
          title="For rice mill owners"
          benefits={MILL_BENEFITS}
        />
        <BenefitCard
          icon="scale"
          title="For rice farmers"
          benefits={FARMER_BENEFITS}
        />
      </div>
    </Section>
  )
}

export default AudienceSection
