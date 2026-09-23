// Heart reaction — outline → filled primary with a live count, optimistic with
// rollback. A signed-out tap asks the parent to open the auth dialog. Serves
// both posts and comments (one FK is passed).
import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import Icon from '../Icon'
import { useAuth } from '../../context/authContext'
import { setForumCommentHeart, setForumPostHeart } from '../../services/forum'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface HeartButtonProps {
  postId?: string
  commentId?: string
  hearted: boolean
  count: number
  onRequireSignIn: () => void
  onChanged?: () => void
  onError?: (message: string) => void
}

function HeartButton({
  postId,
  commentId,
  hearted,
  count,
  onRequireSignIn,
  onChanged,
  onError,
}: HeartButtonProps) {
  const { user } = useAuth()
  const [override, setOverride] = useState<{ hearted: boolean; count: number } | null>(
    null
  )
  const [isPending, setIsPending] = useState(false)

  const currentHearted = override?.hearted ?? hearted
  const currentCount = override?.count ?? count

  const handlePress = async () => {
    if (isPending) {
      return
    }
    if (!user) {
      onRequireSignIn()
      return
    }
    const next = !currentHearted
    setOverride({
      hearted: next,
      count: Math.max(0, currentCount + (next ? 1 : -1)),
    })
    setIsPending(true)
    try {
      if (postId) {
        await setForumPostHeart(postId, user.id, next)
      } else if (commentId) {
        await setForumCommentHeart(commentId, user.id, next)
      }
      onChanged?.()
    } catch (err) {
      // restore the pre-press values (not the original props) and surface it
      setOverride({ hearted: currentHearted, count: currentCount })
      onError?.(
        err instanceof Error
          ? err.message
          : 'Could not update your heart. Please try again.'
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: currentHearted, disabled: isPending }}
      accessibilityLabel={currentHearted ? 'Remove your heart' : 'Heart this'}
      disabled={isPending}
      onPress={handlePress}
      hitSlop={SPACING.sm}
      style={({ pressed }) => [
        styles.button,
        currentHearted && styles.buttonActive,
        (pressed || isPending) && styles.pressed,
      ]}
    >
      <Icon
        name="heart"
        size={18}
        color={currentHearted ? COLORS.primary : COLORS.mute}
        filled={currentHearted}
      />
      <Text
        style={[TYPE.captionSm, currentHearted ? styles.countActive : styles.count]}
      >
        {currentCount}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  buttonActive: {
    borderColor: COLORS.primary,
  },
  pressed: {
    opacity: 0.6,
  },
  count: {
    color: COLORS.mute,
  },
  countActive: {
    color: COLORS.primary,
  },
})

export default HeartButton
