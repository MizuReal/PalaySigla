import { useState } from 'react'
import Button from '../Button'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { createForumComment } from '../../services/forum'
import { getDisplayName } from '../../utils/userProfile'
import { validateForumComment } from '../../utils/forumValidation'

const COMMENT_FIELD_ID = 'forum-comment-body'

interface CommentComposerProps {
  postId: string
  onPosted: () => void
}

function CommentComposer({ postId, onPosted }: CommentComposerProps) {
  const { user, openAuthModal } = useAuth()
  const { showToast } = useToast()
  const [body, setBody] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) {
    return (
      <div className="mt-4 border border-hairline bg-surface-soft p-6">
        <p className="body-sm text-ink">Sign in to join the conversation.</p>
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
          >
            Sign in to comment
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async () => {
    const validation = validateForumComment(body)
    if (validation.body) {
      setFieldError(validation.body)
      document.getElementById(COMMENT_FIELD_ID)?.focus()
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
      showToast('Comment posted.', TOAST_VARIANTS.SUCCESS)
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
    <div className="mt-4">
      <label htmlFor={COMMENT_FIELD_ID} className="caption-md text-ink">
        Add a comment
      </label>
      <textarea
        id={COMMENT_FIELD_ID}
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setFieldError('')
        }}
        placeholder="Share your advice or ask a follow-up."
        rows={4}
        aria-invalid={fieldError ? true : undefined}
        className={`mt-2 w-full border border-hairline bg-canvas px-4 py-3 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary ${
          fieldError ? 'border-error' : ''
        }`}
      />
      {fieldError && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {fieldError}
        </p>
      )}
      {serverError && (
        <div
          className="mt-3 flex items-start gap-3 border border-error bg-surface-soft p-4"
          role="alert"
        >
          <p className="body-sm text-ink">{serverError}</p>
        </div>
      )}
      <div className="mt-3">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Posting…' : 'Post comment'}
        </Button>
      </div>
    </div>
  )
}

export default CommentComposer
