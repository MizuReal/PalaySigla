// Photo step uploader — the DESIGN.md {component.image-uploader} treatment at
// phone scale (dashed hairline dropzone on surface-soft, camera glyph, a 4:3
// preview with a remove affordance, indeterminate processing state). Kept
// presentational: the posting wizard owns useImagePicker so step validation and
// submission read a single source of truth.
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Button from '../Button'
import Icon from '../Icon'
import Photo from '../Photo'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { PreparedImage } from '../../utils/image'

const DROPZONE_MIN_HEIGHT = 220
const CAMERA_ICON_SIZE = 28
const PREVIEW_ASPECT_RATIO = 4 / 3
const ACTION_GAP = SPACING.sm

interface PostListingImageUploaderProps {
  image: PreparedImage | null
  isProcessing: boolean
  error: string
  canOpenSettings: boolean
  onTakePhoto: () => void
  onPickFromLibrary: () => void
  onRemove: () => void
  onOpenSettings: () => void
}

function PostListingImageUploader({
  image,
  isProcessing,
  error,
  canOpenSettings,
  onTakePhoto,
  onPickFromLibrary,
  onRemove,
  onOpenSettings,
}: PostListingImageUploaderProps) {
  return (
    <View>
      {image ? (
        <View style={styles.previewCard}>
          <Photo
            uri={image.uri}
            alt="Listing preview"
            fallbackLabel="Listing preview"
            style={styles.preview}
          />
          <Pressable
            accessibilityRole="button"
            onPress={onRemove}
            style={({ pressed }) => [
              styles.removeAction,
              pressed && styles.pressedDim,
            ]}
          >
            <Text style={[TYPE.bodySm, styles.removeLabel]}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.dropzone}>
          {isProcessing ? (
            <>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={[TYPE.bodySm, styles.dropzoneText]}>
                Processing photo…
              </Text>
            </>
          ) : (
            <>
              <Icon name="camera" size={CAMERA_ICON_SIZE} color={COLORS.body} />
              <Text style={[TYPE.bodySm, styles.dropzoneText]}>
                Add a photo — JPEG or PNG
              </Text>
              <Text style={[TYPE.captionSm, styles.dropzoneHint]}>
                Captured at full resolution, compressed before upload
              </Text>
              <View style={styles.actions}>
                <View style={styles.actionSlot}>
                  <Button label="Take photo" onPress={onTakePhoto} fullWidth />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose from library"
                  onPress={onPickFromLibrary}
                  style={({ pressed }) => [
                    styles.libraryButton,
                    pressed && styles.libraryButtonPressed,
                  ]}
                >
                  <Text style={[TYPE.buttonMd, styles.libraryLabel]}>
                    Choose from library
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}

      {error ? (
        <View style={styles.errorBlock}>
          <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.errorText]}>
            {error}
          </Text>
          {canOpenSettings ? (
            <Pressable
              accessibilityRole="link"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.settingsLink,
                pressed && styles.pressedDim,
              ]}
            >
              <Text style={[TYPE.captionSm, styles.settingsLinkLabel]}>
                Open settings
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  dropzone: {
    minHeight: DROPZONE_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.xl,
  },
  dropzoneText: {
    color: COLORS.body,
    textAlign: 'center',
  },
  dropzoneHint: {
    color: COLORS.mute,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SPACING.md,
    gap: ACTION_GAP,
  },
  actionSlot: {
    alignSelf: 'stretch',
  },
  libraryButton: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
  },
  libraryButtonPressed: {
    borderColor: COLORS.primaryDark,
  },
  libraryLabel: {
    color: COLORS.ink,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
  },
  preview: {
    aspectRatio: PREVIEW_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  removeAction: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  removeLabel: {
    color: COLORS.error,
  },
  pressedDim: {
    opacity: 0.6,
  },
  errorBlock: {
    marginTop: SPACING.sm,
  },
  errorText: {
    color: COLORS.error,
  },
  settingsLink: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  settingsLinkLabel: {
    color: COLORS.linkBlue,
  },
})

export default PostListingImageUploader
