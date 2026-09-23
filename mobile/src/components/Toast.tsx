// One toast panel — the web Toast at phone scale: canvas surface, 1px
// variant border, 2px radius, a leading glyph (check / info / close), the
// message, and a 44px close affordance. Flat chrome — no shadow.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from './Icon'
import type { IconName } from './Icon'
import { TOAST_VARIANTS } from '../context/toastContext'
import type { ToastItem, ToastVariant } from '../context/toastContext'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'

interface ToastVariantStyle {
  border: string
  icon: IconName
  iconColor: string
}

const VARIANT_STYLES: Record<ToastVariant, ToastVariantStyle> = Object.freeze({
  [TOAST_VARIANTS.SUCCESS]: {
    border: COLORS.primary,
    icon: 'check',
    iconColor: COLORS.primary,
  },
  [TOAST_VARIANTS.INFO]: {
    border: COLORS.hairline,
    icon: 'info',
    iconColor: COLORS.ink,
  },
  [TOAST_VARIANTS.ERROR]: {
    border: COLORS.error,
    icon: 'close',
    iconColor: COLORS.error,
  },
})

interface ToastProps {
  toast: ToastItem
  onDismiss: (id: number) => void
}

function Toast({ toast, onDismiss }: ToastProps) {
  const variant = VARIANT_STYLES[toast.variant]
  return (
    <View style={[styles.panel, { borderColor: variant.border }]}>
      <View style={styles.iconSlot}>
        <Icon name={variant.icon} size={20} color={variant.iconColor} />
      </View>
      <Text style={[TYPE.bodySm, styles.message]}>{toast.message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        onPress={() => onDismiss(toast.id)}
        style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
      >
        <Icon name="close" size={16} color={COLORS.mute} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
  },
  iconSlot: {
    marginTop: SPACING.xxs,
  },
  message: {
    flex: 1,
    color: COLORS.ink,
  },
  close: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    marginTop: -SPACING.sm,
    marginRight: -SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.6,
  },
})

export default Toast
