// Verification-document acquisition: camera or library in, validated and
// compressed PreparedImage out. Camera access is requested explicitly before
// launching (AGENTS.md) and every denial state is surfaced with user-facing
// copy — never a silent failure. The photo is re-encoded to JPEG client-side,
// which strips EXIF/GPS metadata before upload.
import { useCallback, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Icon from '../Icon'
import { compressImage, validateImageAsset } from '../../utils/image'
import type { PreparedImage } from '../../utils/image'
import { MAX_CREDENTIAL_DIMENSION } from '../../services/credentials'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const CAMERA_DENIED_MESSAGE =
  'Camera access was denied. You can still choose a photo from your library.'
const CAMERA_BLOCKED_MESSAGE =
  'Camera access is off. Enable it in Settings to take a photo, or choose one from your library.'
const PICKER_FAILED_MESSAGE = 'Could not open the photo picker. Please try again.'
const PROCESS_FAILED_MESSAGE = 'Could not process the photo.'

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 1,
  allowsEditing: false,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
}

interface DocumentPickerFieldProps {
  label: string
  hint?: string
  selected: boolean
  existingLabel?: string
  disabled?: boolean
  error?: string
  onPick: (image: PreparedImage) => void
  onClear?: () => void
}

function DocumentPickerField({
  label,
  hint,
  selected,
  existingLabel = '',
  disabled = false,
  error = '',
  onPick,
  onClear,
}: DocumentPickerFieldProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [localError, setLocalError] = useState('')
  const [canOpenSettings, setCanOpenSettings] = useState(false)

  const processAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      const validationError = validateImageAsset(asset)
      if (validationError) {
        setLocalError(validationError)
        return
      }
      setIsProcessing(true)
      setLocalError('')
      try {
        const prepared = await compressImage(asset, MAX_CREDENTIAL_DIMENSION)
        onPick(prepared)
      } catch (err) {
        setLocalError(err instanceof Error ? err.message : PROCESS_FAILED_MESSAGE)
      } finally {
        setIsProcessing(false)
      }
    },
    [onPick]
  )

  const handleResult = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled) {
        return
      }
      const asset = result.assets?.[0]
      if (!asset) {
        setLocalError(PICKER_FAILED_MESSAGE)
        return
      }
      await processAsset(asset)
    },
    [processAsset]
  )

  const takePhoto = useCallback(async () => {
    setLocalError('')
    setCanOpenSettings(false)
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync()
      if (!permission.granted) {
        setCanOpenSettings(!permission.canAskAgain)
        setLocalError(
          permission.canAskAgain ? CAMERA_DENIED_MESSAGE : CAMERA_BLOCKED_MESSAGE
        )
        return
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS)
      await handleResult(result)
    } catch {
      setLocalError(PICKER_FAILED_MESSAGE)
    }
  }, [handleResult])

  const pickFromLibrary = useCallback(async () => {
    setLocalError('')
    setCanOpenSettings(false)
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS)
      await handleResult(result)
    } catch {
      setLocalError(PICKER_FAILED_MESSAGE)
    }
  }, [handleResult])

  const feedback = error || localError
  const statusLine = selected
    ? 'Photo ready to save.'
    : existingLabel || hint || ''

  return (
    <View style={styles.field}>
      <Text style={[TYPE.captionMd, styles.label]}>{label}</Text>
      <View style={styles.box}>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Take a photo of ${label}`}
            disabled={disabled || isProcessing}
            onPress={() => void takePhoto()}
            style={({ pressed }) => [
              styles.action,
              pressed && !disabled && styles.actionPressed,
              (disabled || isProcessing) && styles.actionDisabled,
            ]}
          >
            <Icon name="camera" size={16} color={COLORS.ink} />
            <Text style={[TYPE.buttonSm, styles.actionLabel]}>
              {isProcessing ? 'Processing…' : 'Take photo'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Choose a photo of ${label} from the library`}
            disabled={disabled || isProcessing}
            onPress={() => void pickFromLibrary()}
            style={({ pressed }) => [
              styles.action,
              pressed && !disabled && styles.actionPressed,
              (disabled || isProcessing) && styles.actionDisabled,
            ]}
          >
            <Text style={[TYPE.buttonSm, styles.actionLabel]}>Choose from library</Text>
          </Pressable>
        </View>
        {statusLine ? (
          <Text style={[TYPE.captionSm, styles.status]}>{statusLine}</Text>
        ) : null}
        {selected && onClear && !disabled ? (
          <Pressable
            accessibilityRole="button"
            onPress={onClear}
            style={({ pressed }) => [styles.clear, pressed && styles.pressedDim]}
          >
            <Text style={[TYPE.captionSm, styles.clearLabel]}>Remove photo</Text>
          </Pressable>
        ) : null}
      </View>
      {feedback ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.error]}>
          {feedback}
        </Text>
      ) : null}
      {canOpenSettings ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            Linking.openSettings().catch(() => undefined)
          }}
          style={({ pressed }) => [styles.settings, pressed && styles.pressedDim]}
        >
          <Text style={[TYPE.captionSm, styles.settingsLabel]}>Open Settings</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    marginTop: SPACING.lg,
  },
  label: {
    color: COLORS.ink,
  },
  box: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  action: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  actionPressed: {
    borderColor: COLORS.primary,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  actionLabel: {
    color: COLORS.ink,
  },
  status: {
    color: COLORS.mute,
  },
  clear: {
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  clearLabel: {
    color: COLORS.error,
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  settings: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  settingsLabel: {
    color: COLORS.linkBlue,
  },
  pressedDim: {
    opacity: 0.6,
  },
})

export default DocumentPickerField
