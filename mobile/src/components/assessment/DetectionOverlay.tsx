// Draws detector boxes over the captured photo. The frame takes the photo's
// own aspect ratio and the image fills it, so normalized coordinates map
// straight to percentages — there is no letterbox offset to compensate for.
// Boxes stay hairline by default; only the area the reviewer selected carries
// the heavier frame and the translucent wash, which keeps a busy sample from
// reading as a wall of green.
import { StyleSheet, View } from 'react-native'
import { Image as ExpoImage } from 'expo-image'
import type { DefectDetection } from '../../types/api'
import { BORDER_WIDTH, COLORS } from '../../theme/designTokens'

const PERCENT_DECIMALS = 4

interface DetectionOverlayProps {
  imageUri: string
  imageWidth: number
  imageHeight: number
  detections: DefectDetection[]
  /** Index into `detections` of the area to emphasise, or null for none. */
  highlightIndex: number | null
}

function toPercent(value: number): `${number}%` {
  return `${(value * 100).toFixed(PERCENT_DECIMALS)}%` as `${number}%`
}

function imageAccessibilityLabel(count: number): string {
  if (count === 0) {
    return 'Assessed paddy sample with no flagged areas'
  }
  return `Assessed paddy sample with ${count} flagged ${count === 1 ? 'area' : 'areas'} outlined`
}

function DetectionOverlay({
  imageUri,
  imageWidth,
  imageHeight,
  detections,
  highlightIndex,
}: DetectionOverlayProps) {
  return (
    <View
      style={[styles.frame, { aspectRatio: imageWidth / imageHeight }]}
      testID="detection-overlay"
    >
      <ExpoImage
        source={{ uri: imageUri }}
        style={styles.image}
        contentFit="fill"
        accessibilityLabel={imageAccessibilityLabel(detections.length)}
      />
      {detections.map((detection, index) => (
        <View
          key={`${detection.class_key}-${index}`}
          pointerEvents="none"
          style={[
            styles.box,
            index === highlightIndex && styles.boxHighlighted,
            {
              left: toPercent(detection.box[0]),
              top: toPercent(detection.box[1]),
              width: toPercent(detection.box[2]),
              height: toPercent(detection.box[3]),
            },
          ]}
          testID="detection-box"
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  box: {
    position: 'absolute',
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.primary,
  },
  boxHighlighted: {
    borderWidth: BORDER_WIDTH.focus,
    backgroundColor: COLORS.primaryWash,
  },
})

export default DetectionOverlay
