// Forum photo editor — up to four 4:3 tiles: kept existing photos (remove),
// removed photos (dimmed with undo), staged new photos (remove), and a dashed
// add tile with a used-slot counter, plus an indeterminate processing spinner.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import ForumPostImage from './ForumPostImage'
import Photo from '../Photo'
import Icon from '../Icon'
import { FORUM_MAX_IMAGES } from '../../services/forum'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { PreparedImage } from '../../utils/image'
import type { ForumImageRef } from '../../types/domain'

const TILE_SIZE = 72
const TILE_ASPECT_RATIO = 4 / 3
const CAMERA_ICON_SIZE = 22

interface ForumImageUploaderProps {
  existingImages: ForumImageRef[]
  removedImageIds: string[]
  newImages: PreparedImage[]
  remainingSlots: number
  isProcessing: boolean
  error: string
  onToggleExisting: (imageId: string) => void
  onAdd: () => void
  onRemoveNew: (index: number) => void
}

function ForumImageUploader({
  existingImages,
  removedImageIds,
  newImages,
  remainingSlots,
  isProcessing,
  error,
  onToggleExisting,
  onAdd,
  onRemoveNew,
}: ForumImageUploaderProps) {
  const keptCount = existingImages.filter(
    (image) => !removedImageIds.includes(image.id)
  ).length
  const usedSlots = keptCount + newImages.length
  const canAdd = remainingSlots > 0 && !isProcessing

  return (
    <View>
      <Text style={[TYPE.captionMd, styles.label]}>Photos (optional)</Text>
      <View style={styles.tileRow}>
        {existingImages.map((image) => {
          const isRemoved = removedImageIds.includes(image.id)
          return (
            <View key={image.id} style={[styles.tileWrap, isRemoved && styles.removed]}>
              <ForumPostImage image={image} alt="Forum photo" style={styles.tile} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isRemoved ? 'Undo remove photo' : 'Remove photo'}
                onPress={() => onToggleExisting(image.id)}
                hitSlop={SPACING.xs}
                style={({ pressed }) => [styles.removeBadge, pressed && styles.pressed]}
              >
                <Icon name="close" size={16} color={COLORS.canvas} />
              </Pressable>
              {isRemoved ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onToggleExisting(image.id)}
                  style={({ pressed }) => [styles.undo, pressed && styles.pressed]}
                >
                  <Text style={[TYPE.captionXs, styles.undoText]}>Undo</Text>
                </Pressable>
              ) : null}
            </View>
          )
        })}

        {newImages.map((image, index) => (
          <View key={`${image.uri}-${index}`} style={styles.tileWrap}>
            <Photo uri={image.uri} alt="New photo" style={styles.tile} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
              onPress={() => onRemoveNew(index)}
              hitSlop={SPACING.xs}
              style={({ pressed }) => [styles.removeBadge, pressed && styles.pressed]}
            >
              <Icon name="close" size={16} color={COLORS.canvas} />
            </Pressable>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add photos"
          accessibilityState={{ disabled: !canAdd }}
          disabled={!canAdd}
          onPress={onAdd}
          style={({ pressed }) => [
            styles.addTile,
            !canAdd && styles.addTileDisabled,
            pressed && canAdd && styles.pressed,
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Icon name="camera" size={CAMERA_ICON_SIZE} color={COLORS.body} />
              <Text style={[TYPE.captionSm, styles.addText]}>
                {usedSlots}/{FORUM_MAX_IMAGES}
              </Text>
            </>
          )}
        </Pressable>
      </View>
      <Text style={[TYPE.captionSm, styles.hint]}>
        Add up to {FORUM_MAX_IMAGES} photos — JPEG or PNG
      </Text>
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.error]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.ink,
  },
  tileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  tileWrap: {
    position: 'relative',
  },
  tile: {
    width: TILE_SIZE,
    aspectRatio: TILE_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  removed: {
    opacity: 0.4,
  },
  removeBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.ink,
  },
  undo: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  undoText: {
    color: COLORS.linkBlue,
  },
  addTile: {
    width: TILE_SIZE,
    aspectRatio: TILE_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
  },
  addTileDisabled: {
    opacity: 0.5,
  },
  addText: {
    color: COLORS.mute,
  },
  hint: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  error: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ForumImageUploader
