// Listing photo with an honest fallback, mirroring the website's Photo
// component: a soft surface frame while the image streams in (`loading`),
// and a labeled "unavailable" panel when the listing has no image or the
// source fails to decode. The fallback label is always the listing title
// so a broken photo never renders as an unexplained blank.
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { COLORS, SPACING, TYPE } from '../theme/designTokens.js'

function Photo({ uri = '', alt = '', fallbackLabel = '', loading = false, style }) {
  // error state is keyed to the URI itself so a new source always retries:
  // no effect-driven reset needed, and a stale failure can never poison the
  // next image (cards re-resolve signed URLs over time)
  const [failedUri, setFailedUri] = useState('')
  const showFallback = !uri || failedUri === uri

  return (
    <View style={[styles.frame, style]}>
      {!showFallback ? (
        <Image
          key={uri}
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          accessibilityLabel={alt}
          onError={() => setFailedUri(uri)}
        />
      ) : null}
      {showFallback && !loading ? (
        <View
          style={styles.fallback}
          accessible
          accessibilityLabel={alt || fallbackLabel || 'Photo unavailable'}
        >
          <Text style={[TYPE.captionSm, styles.fallbackText]}>
            Image unavailable{fallbackLabel ? ` — ${fallbackLabel}` : ''}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    backgroundColor: COLORS.surfaceSoft,
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  fallbackText: {
    color: COLORS.mute,
    textAlign: 'center',
  },
})

export default Photo
