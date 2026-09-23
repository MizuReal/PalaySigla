// Account identity block — avatar (photo or initials monogram), name, email,
// member-since, and the staged change controls (change/remove/undo), mirroring
// the web AvatarEditor.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import Photo from '../Photo'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const AVATAR_SIZE = 96

interface AvatarEditorProps {
  avatarUrl: string
  fallbackInitials: string
  displayName: string
  email: string
  memberSinceLabel: string
  hasAvatar: boolean
  hasPendingFile: boolean
  isRemovalStaged: boolean
  busy: boolean
  error: string
  urlError: string
  previewNote: string
  onPickFile: () => void
  onRemove: () => void
  onCancel: () => void
}

function AvatarEditor({
  avatarUrl,
  fallbackInitials,
  displayName,
  email,
  memberSinceLabel,
  hasAvatar,
  hasPendingFile,
  isRemovalStaged,
  busy,
  error,
  urlError,
  previewNote,
  onPickFile,
  onRemove,
  onCancel,
}: AvatarEditorProps) {
  const showRemove = hasAvatar && !hasPendingFile && !isRemovalStaged
  const showCancel = hasPendingFile || isRemovalStaged

  return (
    <View style={styles.card}>
      {avatarUrl ? (
        <Photo uri={avatarUrl} alt={displayName} style={styles.avatar} />
      ) : (
        <View style={styles.monogram} accessible={false}>
          <Text style={[TYPE.headingXl, styles.monogramText]}>{fallbackInitials}</Text>
        </View>
      )}
      <Text style={[TYPE.bodyStrong, styles.name]} numberOfLines={2}>
        {displayName}
      </Text>
      <Text style={[TYPE.captionSm, styles.meta]} numberOfLines={1}>
        {email}
      </Text>
      <Text style={[TYPE.captionSm, styles.meta]}>Member since {memberSinceLabel}</Text>

      <View style={styles.actions}>
        <Button
          label={busy ? 'Processing…' : 'Change photo'}
          onPress={onPickFile}
          disabled={busy}
          fullWidth
        />
      </View>
      {showRemove ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onRemove}
          style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
        >
          <Text style={[TYPE.bodySm, styles.removeLabel]}>Remove photo</Text>
        </Pressable>
      ) : null}
      {showCancel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={({ pressed }) => [styles.undoButton, pressed && styles.pressed]}
        >
          <Text style={[TYPE.buttonSm, styles.undoLabel]}>
            {hasPendingFile ? 'Undo new photo' : 'Keep photo'}
          </Text>
        </Pressable>
      ) : null}
      {previewNote ? (
        <Text accessibilityLiveRegion="polite" style={[TYPE.captionSm, styles.note]}>
          {previewNote}
        </Text>
      ) : null}
      {urlError ? (
        <Text style={[TYPE.captionSm, styles.error]}>{urlError}</Text>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.error]}>
          {error}
        </Text>
      ) : null}
      <Text style={[TYPE.captionSm, styles.hint]}>JPEG or PNG, up to 10 MB</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  monogram: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    color: COLORS.mute,
  },
  name: {
    color: COLORS.ink,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  meta: {
    color: COLORS.mute,
    marginTop: SPACING.xxs,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
  textAction: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  removeLabel: {
    color: COLORS.error,
  },
  undoButton: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    alignSelf: 'stretch',
  },
  undoLabel: {
    color: COLORS.ink,
  },
  note: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  hint: {
    color: COLORS.mute,
    marginTop: SPACING.md,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default AvatarEditor
