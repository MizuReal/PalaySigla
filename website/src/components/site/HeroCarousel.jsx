import { useEffect, useRef, useState } from 'react'
import Button from '../Button.jsx'
import Container from '../Container.jsx'
import Icon from '../Icon.jsx'
import Photo from '../Photo.jsx'
import PADDY_SLIDES from '../../data/paddySlides.js'
import { RICE_FIELD_VIDEO_URL } from '../../data/media.js'

const SLIDE_INTERVAL_MS = 6000

function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const videoRef = useRef(null)

  const activeSlide = PADDY_SLIDES[activeIndex]
  const isFirstSlide = activeIndex === 0

  // auto-advance pauses on hover/focus and resumes when the panel is left
  useEffect(() => {
    if (isPaused) {
      return undefined
    }
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % PADDY_SLIDES.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isPaused])

  // mount-only effect: respect reduced-motion by freezing the backdrop video
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mediaQuery.matches) {
      videoRef.current?.pause()
    }
  }, [])

  const goToSlide = (index) => {
    setActiveIndex((index + PADDY_SLIDES.length) % PADDY_SLIDES.length)
  }

  const pauseCarousel = () => setIsPaused(true)
  const resumeCarousel = () => setIsPaused(false)

  return (
    <section className="relative overflow-hidden bg-surface-soft">
      <video
        ref={videoRef}
        src={RICE_FIELD_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-surface-soft/75" aria-hidden="true" />
      <Container className="relative grid items-center gap-14 py-16 md:py-[80px] lg:grid-cols-2">
        <div>
          <p className="caption-md text-primary">
            AI-powered post-harvest quality monitoring
          </p>
          <h1 className="display-xl mt-4 text-ink">
            Know your palay&rsquo;s{' '}
            <span className="text-primary">quality</span> in seconds, not
            days.
          </h1>
          <p className="heading-lg mt-6 max-w-xl text-body">
            Point your phone at a handful of harvested paddy. PalaySigla
            returns quality status, mold detection, market grade, and variety
            classification — from one photo, before the buyer&rsquo;s scale
            even settles.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button href="#cta" className="button-lg">
              Get early access
            </Button>
            <Button variant="outline" href="#how-it-works">
              See how it works
            </Button>
          </div>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Paddy varieties PalaySigla can assess"
          onMouseEnter={pauseCarousel}
          onMouseLeave={resumeCarousel}
          onFocus={pauseCarousel}
          onBlur={resumeCarousel}
          className="border border-hairline bg-canvas p-6 sm:p-8"
        >
          <div
            key={activeSlide.id}
            aria-live="polite"
            className="animate-hero-fade"
          >
            <Photo
              src={activeSlide.imageUrl}
              alt={activeSlide.imageAlt}
              fallbackLabel={activeSlide.name}
              aspectClass="aspect-[4/3]"
              loading={isFirstSlide ? 'eager' : 'lazy'}
              fetchPriority={isFirstSlide ? 'high' : 'low'}
            />
            <div className="mt-5">
              <h2 className="heading-md text-ink">{activeSlide.name}</h2>
              <p className="body-sm mt-2 text-mute">
                {activeSlide.description}
              </p>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2">
              {activeSlide.chips.map((chip) => (
                <li
                  key={chip.label}
                  className="rounded-sm border border-hairline bg-surface-soft px-3 py-1.5"
                >
                  <span className="caption-md text-mute">
                    {chip.label}:{' '}
                    <span className="text-primary">{chip.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {PADDY_SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Go to ${slide.name}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className="p-3"
                >
                  <span
                    className={`block h-2 w-2 rounded-sm transition-colors ${
                      index === activeIndex
                        ? 'bg-primary'
                        : 'bg-hairline hover:bg-stone'
                    }`}
                  />
                </button>
              ))}
              <span className="caption-sm ml-3 text-mute">
                {activeIndex + 1} / {PADDY_SLIDES.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToSlide(activeIndex - 1)}
                aria-label="Previous variety"
                className="flex h-11 w-11 items-center justify-center border border-hairline text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name="chevron-left" className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goToSlide(activeIndex + 1)}
                aria-label="Next variety"
                className="flex h-11 w-11 items-center justify-center border border-hairline text-ink transition-colors hover:border-primary hover:text-primary"
              >
                <Icon name="chevron-right" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <p className="caption-xs mt-4 text-mute">
            Photography via Wikimedia Commons contributors
          </p>
        </div>
      </Container>
    </section>
  )
}

export default HeroCarousel
