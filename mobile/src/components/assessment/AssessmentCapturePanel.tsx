// Assessment entry panel: how to photograph a sample, plus the real actions
// (take photo / choose from library). No dead controls.
import type { GestureResponderEvent } from 'react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import { COLORS, GUTTER, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const STEPS = [
  'Spread one layer of paddy on a plain, matte surface.',
  'Shoot straight down so the grain fills most of the frame.',
  'Keep the light even — no flash, no hard shadows.',
]

interface GhostActionProps {
  label: string
  onPress: (event: GestureResponderEvent) => void
  disabled?: boolean
}

function GhostAction({ label, onPress, disabled = false }: GhostActionProps) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={styles.ghost}
    >
      <Text style={[TYPE.buttonMd, styles.ghostText, disabled && styles.ghostDisabled]}>
        {label}
      </Text>
    </Pressable>
  )
}

interface AssessmentCapturePanelProps {
  isBusy: boolean
  onTakePhoto: () => void
  onPickFromLibrary: () => void
  onOpenSettings: (() => void) | null
}

function AssessmentCapturePanel({
  isBusy,
  onTakePhoto,
  onPickFromLibrary,
  onOpenSettings,
}: AssessmentCapturePanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Assess</Text>
      <Text style={[TYPE.displayLg, styles.title]}>Photograph the paddy sample</Text>
      <Text style={[TYPE.bodyMd, styles.sub]}>
        One top-down photo returns every detected mold or discolored grain, the
        share of the sample they cover, and a review flag when confidence is low.
      </Text>
      <View style={styles.card}>
        <View style={styles.stepList}>
          {STEPS.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <Text style={[TYPE.bodyStrong, styles.stepNumber]}>{index + 1}</Text>
              <Text style={[TYPE.bodySm, styles.stepText]}>{step}</Text>
            </View>
          ))}
        </View>
        <Button
          label={isBusy ? 'Preparing…' : 'Take photo'}
          onPress={onTakePhoto}
          disabled={isBusy}
          fullWidth
        />
        <GhostAction
          label="Choose from library"
          onPress={onPickFromLibrary}
          disabled={isBusy}
        />
        {onOpenSettings ? (
          <GhostAction label="Open settings to allow camera" onPress={onOpenSettings} />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignSelf: 'stretch',
  },
  eyebrow: {
    color: COLORS.mute,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.md,
  },
  sub: {
    color: COLORS.body,
    marginTop: SPACING.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  stepList: {
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  stepNumber: {
    color: COLORS.primary,
    minWidth: 20,
  },
  stepText: {
    flex: 1,
    color: COLORS.body,
  },
  ghost: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: COLORS.primary,
  },
  ghostDisabled: {
    color: COLORS.ash,
  },
})

export default AssessmentCapturePanel
