// One comment — author line, body, heart, and owner Edit/Delete. Delete runs
// the inline two-tap confirm; edits validate 1–2000 chars and save in place.
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import AuthorBadge from './AuthorBadge'
import DeleteInlineConfirm from './DeleteInlineConfirm'
import HeartButton from './HeartButton'
import { useAuth } from '../../context/authContext'
import { softDeleteForumComment, updateForumComment } from '../../services/forum'
import { validateForumComment } from '../../utils/forumValidation'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { ForumCommentItem } from '../../types/domain'

interface CommentItemProps {
  comment: ForumCommentItem
  onChanged: () => void
  onRequireSignIn: () => void
  onError?: (message: string) => void
}

function CommentItem({
  comment,
  onChanged,
  onRequireSignIn,
  onError,
}: CommentItemProps) {
  const { user } = useAuth()
  const isOwner = user !== null && user.id === comment.user_id
  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [fieldError, setFieldError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    const errors = validateForumComment(editBody)
    if (errors.body) {
      setFieldError(errors.body)
      return
    }
    setFieldError('')
    setIsSaving(true)
    try {
      await updateForumComment({ commentId: comment.id, body: editBody })
      setIsEditing(false)
      onChanged()
    } catch (err) {
      setFieldError(
        err instanceof Error ? err.message : 'Could not save the comment. Please try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await softDeleteForumComment(comment.id)
      onChanged()
    } catch (err) {
      setIsDeleting(false)
      setIsConfirmingDelete(false)
      onError?.(
        err instanceof Error
          ? err.message
          : 'Could not remove the comment. Please try again.'
      )
    }
  }

  return (
    <View style={styles.row}>
      <AuthorBadge
        name={comment.author_name}
        timestamp={comment.created_at}
        isEdited={comment.updated_at !== null}
      />
      {isEditing ? (
        <View style={styles.editBlock}>
          <TextInput
            style={[styles.editInput, fieldError ? styles.editInputError : null]}
            value={editBody}
            onChangeText={(value) => {
              setEditBody(value)
              if (fieldError) {
                setFieldError('')
              }
            }}
            multiline
            accessibilityLabel="Edit comment"
            maxLength={2000}
          />
          {fieldError ? (
            <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
              {fieldError}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving }}
              disabled={isSaving}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveButton,
                isSaving && styles.disabled,
                pressed && !isSaving && styles.pressed,
              ]}
            >
              <Text style={[TYPE.buttonSm, styles.saveLabel]}>
                {isSaving ? 'Saving…' : 'Save'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => {
                setIsEditing(false)
                setEditBody(comment.body)
                setFieldError('')
              }}
              style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
            >
              <Text style={[TYPE.buttonSm, styles.cancelLabel]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={[TYPE.bodySm, styles.body]}>{comment.body}</Text>
      )}

      <View style={styles.footer}>
        <HeartButton
          commentId={comment.id}
          hearted={comment.hasHearted}
          count={comment.heart_count}
          onRequireSignIn={onRequireSignIn}
          onChanged={onChanged}
          onError={onError}
        />
        {isOwner && !isEditing ? (
          <>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsEditing(true)
                setEditBody(comment.body)
              }}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            >
              <Text style={[TYPE.buttonSm, styles.textActionLabel]}>Edit</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsConfirmingDelete(true)}
              style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
            >
              <Text style={[TYPE.buttonSm, styles.deleteLabel]}>Delete</Text>
            </Pressable>
          </>
        ) : null}
      </View>

      {isConfirmingDelete ? (
        <DeleteInlineConfirm
          prompt="Remove this comment?"
          confirmLabel="Yes, remove it"
          pendingLabel="Removing…"
          isPending={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    gap: SPACING.sm,
  },
  body: {
    color: COLORS.body,
  },
  editBlock: {
    gap: SPACING.sm,
  },
  editInput: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    color: COLORS.ink,
    textAlignVertical: 'top',
    ...TYPE.bodyMd,
  },
  editInputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  saveButton: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
  },
  saveLabel: {
    color: COLORS.onPrimary,
  },
  cancel: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.md,
  },
  cancelLabel: {
    color: COLORS.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  textAction: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  textActionLabel: {
    color: COLORS.mute,
  },
  deleteLabel: {
    color: COLORS.error,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default CommentItem
