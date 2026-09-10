import type { ReactNode } from 'react'
import Container from './Container.jsx'

const TONE_CLASSES = {
  canvas: 'bg-canvas',
  soft: 'bg-surface-soft',
}

type SectionTone = keyof typeof TONE_CLASSES

interface SectionProps {
  id?: string
  tone?: SectionTone
  className?: string
  children: ReactNode
}

function Section({ id, tone = 'canvas', className = '', children }: SectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-16 ${TONE_CLASSES[tone]} py-8 sm:py-12 lg:py-section ${className}`}
    >
      <Container>{children}</Container>
    </section>
  )
}

export default Section
