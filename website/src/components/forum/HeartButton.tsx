import { useState } from 'react'
import Icon from '../Icon'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { setForumCommentHeart, setForumPostHeart } from '../../services/forum'

interface HeartButtonProps {
  heartCount: number
  hasHearted: boolean
  label: string
  postId?: string
  commentId?: string
  onChanged?: () => void
  // 'pill' is the standalone hairline control (comments, thread); 'bar' is the
  // borderless equal-width action segment used in the feed card's action row
  variant?: 'pill' | 'bar'
}

const PILL_BASE =
  'inline-flex h-11 items-center gap-2 rounded-sm border px-3 button-sm transition-colors disabled:opacity-60'
const BAR_BASE =
  'inline-flex h-11 flex-1 items-center justify-center gap-2 button-sm transition-colors disabled:opacity-60'

function variantClasses(isHearted: boolean, variant: 'pill' | 'bar'): string {
  if (variant === 'bar') {
    return isHearted ? 'text-primary' : 'text-mute hover:text-primary'
  }
  return isHearted
    ? 'border-primary text-primary'
    : 'border-hairline text-mute hover:border-primary hover:text-primary'
}

// local state is the optimistic source while the request is in flight; the
// server value seeds it again whenever the component remounts
function HeartButton({
  heartCount,
  hasHearted,
  label,
  postId,
  commentId,
  onChanged,
  variant = 'pill',
}: HeartButtonProps) {
  const { user, openAuthModal } = useAuth()
  const { showToast } = useToast()
  const [isHearted, setIsHearted] = useState(hasHearted)
  const [count, setCount] = useState(heartCount)
  const [isPending, setIsPending] = useState(false)

  const handleClick = async () => {
    if (!user) {
      openAuthModal(AUTH_MODAL_MODES.LOGIN)
      return
    }
    const nextHearted = !isHearted
    setIsHearted(nextHearted)
    setCount((current) => Math.max(0, current + (nextHearted ? 1 : -1)))
    setIsPending(true)
    try {
      if (postId) {
        await setForumPostHeart(postId, user.id, nextHearted)
      } else if (commentId) {
        await setForumCommentHeart(commentId, user.id, nextHearted)
      }
    } catch (err) {
      setIsHearted(!nextHearted)
      setCount((current) => Math.max(0, current + (nextHearted ? -1 : 1)))
      showToast(
        err instanceof Error ? err.message : 'Could not update your heart.',
        TOAST_VARIANTS.ERROR
      )
      return
    } finally {
      setIsPending(false)
    }
    // a parent refresh callback must never be able to roll back the toggle
    onChanged?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isHearted}
      aria-label={
        isHearted ? `Remove your heart from ${label}` : `Heart ${label}`
      }
      disabled={isPending}
      className={`${variant === 'bar' ? BAR_BASE : PILL_BASE} ${variantClasses(
        isHearted,
        variant
      )}`}
    >
      <Icon
        name="heart"
        className={`h-5 w-5 ${isHearted ? 'fill-current' : ''}`}
      />
      <span>{count}</span>
    </button>
  )
}

export default HeartButton
