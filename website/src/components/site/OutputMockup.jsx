import Icon from '../Icon.jsx'
import Photo from '../Photo.jsx'
import Section from '../Section.jsx'
import SectionHeader from '../SectionHeader.jsx'
import { GOLDEN_PADDY_IMAGE } from '../../data/paddySlides.js'

const SAMPLE_RESULTS = [
  { icon: 'quality', label: 'Quality status', value: 'Dry · Clean', confidence: 96 },
  { icon: 'mold', label: 'Mold', value: 'None detected', confidence: 94 },
  { icon: 'grade', label: 'Market grade', value: 'Grade A', confidence: 91 },
  { icon: 'variety', label: 'Variety', value: 'NSIC RC 222', confidence: 89 },
]

function OutputMockup() {
  return (
    <Section id="result">
      <SectionHeader
        eyebrow="One photo. Four answers."
        title="This is what a PalaySigla scan looks like."
        sub="All four checks run on the same image, in the same request, so the results always agree with each other — and every result ships with a per-class confidence score."
      />
      <div className="grid border border-hairline bg-canvas lg:grid-cols-2">
        <div className="relative p-4 sm:p-6">
          <Photo
            src={GOLDEN_PADDY_IMAGE}
            alt="Close-up of golden unhulled paddy grains used in a sample scan"
            fallbackLabel="sample scan photo"
            aspectClass="aspect-[4/3]"
            loading="lazy"
          />
          <span className="caption-md absolute left-8 top-8 rounded-sm border border-hairline bg-surface-soft px-2.5 py-1 text-body sm:left-10 sm:top-10">
            Sample scan
          </span>
        </div>

        <div className="border-t border-hairline p-6 sm:p-8 lg:border-l lg:border-t-0">
          <ul className="space-y-5">
            {SAMPLE_RESULTS.map((result) => (
              <li key={result.label}>
                <div className="flex items-center gap-3">
                  <Icon
                    name={result.icon}
                    className="h-5 w-5 shrink-0 text-primary"
                  />
                  <div className="flex-1">
                    <p className="caption-sm text-mute">{result.label}</p>
                    <p className="body-strong text-ink">{result.value}</p>
                  </div>
                  <p className="body-strong text-primary">
                    {result.confidence}%
                  </p>
                </div>
                <div className="ml-8 mt-2 h-1.5 bg-hairline">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="caption-sm mt-6 text-mute">
            Sample result for illustration. Every scan is stored in your
            record.
          </p>
        </div>
      </div>
    </Section>
  )
}

export default OutputMockup
