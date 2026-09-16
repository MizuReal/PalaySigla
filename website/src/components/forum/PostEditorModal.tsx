import { useState } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import Modal from '../Modal'
import { useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { createForumPost, updateForumPost } from '../../services/forum'
import { getDisplayName } from '../../utils/userProfile'
import { validateForumPost } from '../../utils/forumValidation'
import type { ForumPostErrors } from '../../utils/forumValidation'
import type { ForumPostSummary } from '../../types/domain'

const MODAL_TITLE_ID = 'forum-editor-title'
const TITLE_FIELD_ID = 'forum-post-title'
const BODY_FIELD_ID = 'forum-post-body'

const FIELD_CLASSES =
  'mt-2 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary'

interface PostEditorModalProps {
  post?: ForumPostSummary | null
  onClose: () => void
  onSaved: () => void
}

function PostEditorModal({ post = null, onClose, onSaved }: PostEditorModalProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isEditing = post !== null

  const [title, setTitle] = useState(post?.title ?? '')
  const [body, setBody] = useState(post?.body ?? '')
  const [errors, setErrors] = useState<ForumPostErrors>({})
  const [serverError, setServerError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const validation = validateForumPost({ title, body })
    setErrors(validation)
    if (validation.title) {
      document.getElementById(TITLE_FIELD_ID)?.focus()
      return
    }
    if (validation.body) {
      document.getElementById(BODY_FIELD_ID)?.focus()
      return
    }
    if (!user) {
      setServerError('You must be signed in to post a discussion.')
      return
    }
    setServerError('')
    setIsSubmitting(true)
    try {
      if (isEditing) {
        await updateForumPost({ postId: post.id, title, body })
        showToast('Discussion updated.', TOAST_VARIANTS.SUCCESS)
      } else {
        await createForumPost({
          userId: user.id,
          authorName: getDisplayName(user),
          title,
          body,
        })
        showToast('Discussion published!', TOAST_VARIANTS.SUCCESS)
      }
      onSaved()
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not save the discussion. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal onClose={onClose} labelledBy={MODAL_TITLE_ID} panelClassName="max-w-2xl">
      <p className="caption-md text-primary">Community forum</p>
      <h2 id={MODAL_TITLE_ID} className="heading-md mt-2 text-ink">
        {isEditing ? 'Edit discussion' : 'Start a discussion'}
      </h2>
      <p className="body-sm mt-1 text-mute">
        {isEditing
          ? 'Update the title or details of your post.'
          : 'Ask a question or share what you have learned in the field.'}
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label htmlFor={TITLE_FIELD_ID} className="caption-md text-ink">
            Title
          </label>
          <input
            id={TITLE_FIELD_ID}
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setErrors((current) => ({ ...current, title: undefined }))
            }}
            placeholder="When should I dry palay after harvest?"
            aria-invalid={errors.title ? true : undefined}
            className={`${FIELD_CLASSES} h-11 ${errors.title ? 'border-error' : ''}`}
          />
          {errors.title && (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.title}
            </p>
          )}
        </div>
        <div>
          <label htmlFor={BODY_FIELD_ID} className="caption-md text-ink">
            Details
          </label>
          <textarea
            id={BODY_FIELD_ID}
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setErrors((current) => ({ ...current, body: undefined }))
            }}
            placeholder="Share the details — variety, weather, moisture, what you have tried."
            rows={8}
            aria-invalid={errors.body ? true : undefined}
            className={`${FIELD_CLASSES} py-3 ${errors.body ? 'border-error' : ''}`}
          />
          {errors.body && (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.body}
            </p>
          )}
        </div>
      </div>

      {serverError && (
        <div
          className="mt-6 flex items-start gap-3 border border-error bg-surface-soft p-4"
          role="alert"
        >
          <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <p className="body-sm text-ink">{serverError}</p>
        </div>
      )}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="w-full justify-center sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full justify-center sm:w-auto"
        >
          {isSubmitting
            ? 'Saving…'
            : isEditing
              ? 'Save changes'
              : 'Publish discussion'}
        </Button>
      </div>
    </Modal>
  )
}

export default PostEditorModal
