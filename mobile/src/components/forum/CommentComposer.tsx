// New-comment composer — signed out it prompts sign-in; signed in it validates
// (1–2000 chars), posts, clears, and tells the thread to reload.
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext'
import { createForumComment } from '../../services/forum'
import { validateForumComment } from '../../utils/forumValidation'
import { getDisplayName } from '../../utils/userProfile'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const INPUT_HEIGHT = 88

interface CommentComposerProps {
  postId: string
  onPosted: () => void
}

function CommentComposer({ postId, onPosted }: CommentComposerProps) {
  const { user, openAuthModal } = useAuth()
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) {
    return (
      <View style={styles.signedOut}>
        <Text style={[TYPE.bodySm, styles.signedOutText]}>
          Sign in to join the conversation.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
          style={({ pressed }) => [styles.signInButton, pressed && styles.pressed]}
        >
          <Text style={[TYPE.buttonSm, styles.signInLabel]}>Sign in</Text>
        </Pressable>
      </View>
    )
  }

  const handleSubmit = async () => {
    const errors = validateForumComment(body)
    if (errors.body) {
      setFieldError(errors.body)
      return
    }
    setFieldError('')
    setServerError('')
    setIsSubmitting(true)
    try {
      await createForumComment({
        postId,
        userId: user.id,
        authorName: getDisplayName(user),
        body,
      })
      setBody('')
      onPosted()
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Could not post the comment. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <View>
      <TextInput
        style={[styles.input, fieldError ? styles.inputError : null]}
        value={body}
        onChangeText={(value) => {
          setBody(value)
          if (fieldError) {
            setFieldError('')
          }
        }}
        placeholder="Share what you know…"
        placeholderTextColor={COLORS.stone}
        multiline
        accessibilityLabel="Write a comment"
        autoCorrect
        maxLength={2000}
      />
      {fieldError ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {fieldError}
        </Text>
      ) : null}
      {serverError ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {serverError}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        disabled={isSubmitting}
        onPress={handleSubmit}
        style={({ pressed }) => [
          styles.postButton,
          isSubmitting && styles.disabled,
          pressed && !isSubmitting && styles.pressed,
        ]}
      >
        <Text style={[TYPE.buttonSm, styles.postLabel]}>
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  signedOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  signedOutText: {
    flex: 1,
    color: COLORS.body,
  },
  signInButton: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  signInLabel: {
    color: COLORS.ink,
  },
  input: {
    minHeight: INPUT_HEIGHT,
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
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  postButton: {
    minHeight: TOUCH_TARGET,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  postLabel: {
    color: COLORS.onPrimary,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default CommentComposer
