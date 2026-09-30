// Shared verification-record card shell: heading, lock notice, add toggle,
// existing records, and the action error banner. Mirrors the web shell so the
// surfaces read as one system.
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import Icon from '../Icon'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

interface VerificationSectionShellProps {
  title: string
  description: string
  addLabel: string
  isLocked: boolean
  isAddOpen: boolean
  onToggleAdd: () => void
  actionError: string
  hasItems: boolean
  emptyLabel: string
  list: ReactNode
  children: ReactNode
}

function SectionError({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Icon name="info" size={20} color={COLORS.error} />
      <Text style={[TYPE.bodySm, styles.errorText]}>{message}</Text>
    </View>
  )
}

function VerificationSectionShell({
  title,
  description,
  addLabel,
  isLocked,
  isAddOpen,
  onToggleAdd,
  actionError,
  hasItems,
  emptyLabel,
  list,
  children,
}: VerificationSectionShellProps) {
  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>{title}</Text>
      <Text style={[TYPE.bodySm, styles.description]}>{description}</Text>

      {isLocked ? (
        <View style={styles.locked}>
          <Icon name="info" size={16} color={COLORS.mute} />
          <Text style={[TYPE.captionSm, styles.lockedText]}>
            Your profile is verified, so these records are locked. Contact the review
            team if you need to correct them.
          </Text>
        </View>
      ) : (
        <View style={styles.addWrap}>
          <Button
            label={isAddOpen ? 'Cancel' : addLabel}
            onPress={onToggleAdd}
          />
        </View>
      )}

      {isAddOpen ? <View style={styles.form}>{children}</View> : null}

      {actionError ? <SectionError message={actionError} /> : null}

      <View style={styles.listWrap}>
        {hasItems ? (
          list
        ) : (
          <Text style={[TYPE.captionSm, styles.empty]}>{emptyLabel}</Text>
        )}
      </View>
    </View>
  )
}

export function RemoveRecordButton({
  isRemoving,
  disabled,
  onPress,
}: {
  isRemoving: boolean
  disabled: boolean
  onPress: () => void
}) {
  if (disabled) {
    return null
  }
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isRemoving}
      onPress={onPress}
      style={({ pressed }) => [styles.remove, pressed && styles.pressedDim]}
    >
      <Text style={[TYPE.bodySm, styles.removeLabel]}>
        {isRemoving ? 'Removing…' : 'Remove'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.ink,
  },
  description: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  lockedText: {
    flex: 1,
    color: COLORS.mute,
  },
  addWrap: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
  },
  form: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  errorText: {
    flex: 1,
    color: COLORS.ink,
  },
  listWrap: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  empty: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    color: COLORS.mute,
  },
  remove: {
    minHeight: 44,
    justifyContent: 'center',
  },
  removeLabel: {
    color: COLORS.error,
  },
  pressedDim: {
    opacity: 0.6,
  },
})

export default VerificationSectionShell
