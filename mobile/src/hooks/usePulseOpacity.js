// Shared loading-skeleton pulse: a looping opacity dip on an Animated.Value.
// Each caller animates its own value with the native driver — no layout
// work on the JS thread.
import { useEffect, useState } from 'react'
import { Animated, Easing } from 'react-native'

const PULSE_DURATION_MS = 700
const PULSE_MIN_OPACITY = 0.45

function usePulseOpacity() {
  // lazy-initialized state keeps the Animated.Value stable across renders
  // without touching a ref during render
  const [opacity] = useState(() => new Animated.Value(1))

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: PULSE_MIN_OPACITY,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return opacity
}

export default usePulseOpacity
