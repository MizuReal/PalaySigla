import Container from './Container.jsx'

const TONE_CLASSES = {
  canvas: 'bg-canvas',
  soft: 'bg-surface-soft',
}

function Section({ id, tone = 'canvas', className = '', children }) {
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
