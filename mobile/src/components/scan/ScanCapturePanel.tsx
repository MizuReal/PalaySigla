// Scan entry panel: what the sheet is, how to fill it, and the real actions
// (take photo / choose from library / print the sheet). No dead controls.
import type { GestureResponderEvent } from 'react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import { COLORS, GUTTER, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const STEPS = [
  'Print the scan sheet and write one digit per cell with a dark pen.',
  'Lay it flat, fill the frame, and keep all four corner marks visible.',
  'Take the photo — the six values come back for your review.',
]

interface ScanCapturePanelProps {
  sheetUrl: string | null
  isBusy: boolean
  onTakePhoto: () => void
  onPickFromLibrary: () => void
  onOpenSheet: () => void
  onOpenSettings: (() => void) | null
}

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

function ScanCapturePanel({
  sheetUrl,
  isBusy,
  onTakePhoto,
  onPickFromLibrary,
  onOpenSheet,
  onOpenSettings,
}: ScanCapturePanelProps) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Scan</Text>
      <Text style={[TYPE.displayLg, styles.title]}>Photograph a filled sheet</Text>
      <Text style={[TYPE.bodyMd, styles.sub]}>
        One photo of the PalaySigla scan sheet returns all six measurements at
        once — read from the handwritten digit cells.
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
          label={isBusy ? 'Reading…' : 'Take photo'}
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
        {sheetUrl ? <GhostAction label="Print the scan sheet" onPress={onOpenSheet} /> : null}
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

export default ScanCapturePanel
