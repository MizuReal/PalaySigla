// Hero band: headline copy + rotating paddy-photo card (the website hero
// minus the backdrop video and CTA buttons, which have no destination on a
// content-only landing). Carousel auto-advances every SLIDE_INTERVAL_MS and
// cross-fades photos on each slide change.
import { useEffect, useState } from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon.jsx'
import PADDY_SLIDES from '../../data/paddySlides.js'
import {
  COLORS,
  GUTTER,
  RADIUS,
  SPACING,
  TYPE,
} from '../../theme/designTokens.js'

const SLIDE_INTERVAL_MS = 6000
const FADE_DURATION_MS = 400
const PHOTO_ASPECT_RATIO = 4 / 3

function SlidePhoto({ slide }) {
  // state-backed Animated.Value: the fade driver must outlive re-renders but
  // refs are not readable during render
  const [opacity] = useState(() => new Animated.Value(0))

  // fade the freshly mounted photo in; only the active slide is mounted
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_DURATION_MS,
      useNativeDriver: true,
    }).start()
  }, [opacity, slide.id])

  return (
    <Animated.View style={[styles.photoFrame, { opacity }]}>
      <Image
        source={{ uri: slide.imageUrl }}
        style={styles.photo}
        resizeMode="cover"
        accessibilityLabel={slide.imageAlt}
      />
    </Animated.View>
  )
}

function SlideCopy({ slide }) {
  return (
    <View>
      <Text style={[TYPE.headingMd, styles.slideName]}>{slide.name}</Text>
      <Text style={[TYPE.bodySm, styles.slideDescription]}>
        {slide.description}
      </Text>
      <View style={styles.chipRow}>
        {slide.chips.map((chip) => (
          <View key={chip.label} style={styles.chip}>
            <Text style={[TYPE.captionMd, styles.chipText]}>
              {chip.label}:{' '}
              <Text style={styles.chipValue}>{chip.value}</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function Carousel() {
  const [activeIndex, setActiveIndex] = useState(0)
  const slideCount = PADDY_SLIDES.length
  const activeSlide = PADDY_SLIDES[activeIndex]

  // mount-only timer: auto-advances through the slides forever
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [slideCount])

  const goToSlide = (index) => {
    setActiveIndex(((index % slideCount) + slideCount) % slideCount)
  }

  return (
    <View style={styles.card}>
      <SlidePhoto slide={activeSlide} />
      <SlideCopy slide={activeSlide} />

      <View style={styles.controls}>
        <View style={styles.controlCluster}>
          {PADDY_SLIDES.map((slide, index) => {
            const isActive = index === activeIndex
            return (
              <Pressable
                key={slide.id}
                onPress={() => goToSlide(index)}
                hitSlop={SPACING.sm}
                accessibilityRole="button"
                accessibilityLabel={`Go to ${slide.name}`}
                accessibilityState={{ selected: isActive }}
                style={styles.dotPressable}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isActive ? COLORS.primary : COLORS.hairline },
                  ]}
                />
              </Pressable>
            )
          })}
          <Text style={[TYPE.captionSm, styles.slideCounter]}>
            {activeIndex + 1} / {slideCount}
          </Text>
        </View>

        <View style={styles.controlCluster}>
          <Pressable
            onPress={() => goToSlide(activeIndex - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous variety"
            style={({ pressed }) => [
              styles.chevronButton,
              pressed && styles.chevronButtonPressed,
            ]}
          >
            {({ pressed }) => (
              <Icon
                name="chevron-left"
                color={pressed ? COLORS.primary : COLORS.ink}
              />
            )}
          </Pressable>
          <Pressable
            onPress={() => goToSlide(activeIndex + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next variety"
            style={({ pressed }) => [
              styles.chevronButton,
              pressed && styles.chevronButtonPressed,
            ]}
          >
            {({ pressed }) => (
              <Icon
                name="chevron-right"
                color={pressed ? COLORS.primary : COLORS.ink}
              />
            )}
          </Pressable>
        </View>
      </View>

      <Text style={[TYPE.captionXs, styles.credit]}>
        Photography via Wikimedia Commons contributors
      </Text>
    </View>
  )
}

function LandingHero() {
  return (
    <View style={styles.hero}>
      <View style={styles.copyColumn}>
        <Text style={[TYPE.captionMd, styles.eyebrow]}>
          AI-powered post-harvest quality monitoring
        </Text>
        <Text style={[TYPE.displayXl, styles.headline]}>
          Know your palay&apos;s <Text style={styles.headlineAccent}>quality</Text> in
          seconds, not days.
        </Text>
        <Text style={[TYPE.headingLg, styles.subhead]}>
          {'Point your phone at a handful of harvested paddy. PalaySigla returns quality status, mold detection, market grade, and variety classification \u2014 from one photo, before the buyer\u2019s scale even settles.'}
        </Text>
      </View>
      <Carousel />
    </View>
  )
}

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.section,
    gap: SPACING.xxl,
  },
  copyColumn: {
    gap: SPACING.xl,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  headline: {
    color: COLORS.ink,
  },
  headlineAccent: {
    color: COLORS.primary,
  },
  subhead: {
    color: COLORS.body,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    padding: SPACING.xl,
    gap: 0,
  },
  photoFrame: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT_RATIO,
    backgroundColor: COLORS.surfaceSoft,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  slideName: {
    color: COLORS.ink,
    marginTop: SPACING.lg,
  },
  slideDescription: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + SPACING.xxs,
  },
  chipText: {
    color: COLORS.mute,
  },
  chipValue: {
    color: COLORS.primary,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.xl,
  },
  controlCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  dotPressable: {
    padding: SPACING.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.sm,
  },
  slideCounter: {
    color: COLORS.mute,
    marginLeft: SPACING.md,
  },
  chevronButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronButtonPressed: {
    borderColor: COLORS.primary,
  },
  credit: {
    color: COLORS.mute,
    marginTop: SPACING.lg,
  },
})

export default LandingHero
