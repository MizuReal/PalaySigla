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
}

// local state is the optimistic source while the request is in flight; the
// server value seeds it again whenever the component remounts
function HeartButton({
  heartCount,
  hasHearted,
  label,
  postId,
  commentId,
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
    } finally {
      setIsPending(false)
    }
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
      className={`inline-flex h-11 items-center gap-2 rounded-sm border px-3 button-sm transition-colors disabled:opacity-60 ${
        isHearted
          ? 'border-primary text-primary'
          : 'border-hairline text-mute hover:border-primary hover:text-primary'
      }`}
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
