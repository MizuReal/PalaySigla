// Inline two-tap confirm panel (web DeleteInlineConfirm ported): an
// error-bordered box whose confirm button swaps to a pending label while the
// action runs; both buttons disable then.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface DeleteInlineConfirmProps {
  prompt: string
  confirmLabel: string
  pendingLabel: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteInlineConfirm({
  prompt,
  confirmLabel,
  pendingLabel,
  isPending,
  onConfirm,
  onCancel,
}: DeleteInlineConfirmProps) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.bodySm, styles.prompt]}>{prompt}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPending }}
          disabled={isPending}
          onPress={onConfirm}
          style={({ pressed }) => [
            styles.confirm,
            isPending && styles.disabled,
            pressed && !isPending && styles.confirmPressed,
          ]}
        >
          <Text style={[TYPE.buttonSm, styles.confirmLabel]}>
            {isPending ? pendingLabel : confirmLabel}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPending }}
          disabled={isPending}
          onPress={onCancel}
          style={({ pressed }) => [
            styles.cancel,
            isPending && styles.disabled,
            pressed && !isPending && styles.cancelPressed,
          ]}
        >
          <Text style={[TYPE.buttonSm, styles.cancelLabel]}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  prompt: {
    color: COLORS.ink,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  confirm: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  confirmPressed: {
    backgroundColor: COLORS.error,
  },
  confirmLabel: {
    color: COLORS.error,
  },
  cancel: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  cancelPressed: {
    borderColor: COLORS.primary,
  },
  cancelLabel: {
    color: COLORS.ink,
  },
  disabled: {
    opacity: 0.5,
  },
})

export default DeleteInlineConfirm
