import Icon from '../Icon.jsx'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'

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

function HowItWorks() {
  return (
    <Section id="how-it-works" tone="soft">
      <SectionHeader
        eyebrow="How it works"
        title="Three steps, zero guesswork"
        sub="From a handful of palay to a full quality readout in the time it takes to read this sentence."
      />
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border border-hairline bg-canvas p-8">
            <Icon name={step.icon} className="h-6 w-6 text-primary" />
            <p className="caption-md mt-6 text-mute">Step {index + 1}</p>
            <h3 className="heading-md mt-2 text-ink">{step.title}</h3>
            <p className="body-md mt-3 text-body">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export default HowItWorks
