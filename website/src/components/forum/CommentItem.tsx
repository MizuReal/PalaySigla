import { useState } from 'react'
import AuthorBadge from './AuthorBadge'
import DeleteInlineConfirm from './DeleteInlineConfirm'
import HeartButton from './HeartButton'
import Button from '../Button'
import { useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { softDeleteForumComment, updateForumComment } from '../../services/forum'
import { validateForumComment } from '../../utils/forumValidation'
import type { ForumCommentItem } from '../../types/domain'

interface CommentItemProps {
  comment: ForumCommentItem
  onChanged: () => void
}

function CommentItem({ comment, onChanged }: CommentItemProps) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const isOwner = user !== null && user.id === comment.user_id
  const editFieldId = `forum-comment-edit-${comment.id}`

  const [isEditing, setIsEditing] = useState(false)
  const [editBody, setEditBody] = useState(comment.body)
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSave = async () => {
    const validation = validateForumComment(editBody)
    if (validation.body) {
      setEditError(validation.body)
      document.getElementById(editFieldId)?.focus()
      return
    }
    setEditError('')
    setIsSaving(true)
    try {
      await updateForumComment({ commentId: comment.id, body: editBody })
      setIsEditing(false)
      showToast('Comment updated.', TOAST_VARIANTS.SUCCESS)
      onChanged()
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Could not save the comment. Please try again.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true)
      return
    }
    setIsDeleting(true)
    try {
      await softDeleteForumComment(comment.id)
      showToast('Comment removed.', TOAST_VARIANTS.SUCCESS)
      onChanged()
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not remove the comment. Please try again.',
        TOAST_VARIANTS.ERROR
      )
      setIsDeleting(false)
      setIsConfirmingDelete(false)
    }
  }

  return (
    <li className="border-t border-hairline py-5">
      <AuthorBadge
        name={comment.author_name}
        timestamp={comment.created_at}
        isEdited={comment.updated_at !== null}
      />
      {isEditing ? (
        <div className="mt-3">
          <label htmlFor={editFieldId} className="sr-only">
            Edit your comment
          </label>
          <textarea
            id={editFieldId}
            value={editBody}
            onChange={(event) => {
              setEditBody(event.target.value)
              setEditError('')
            }}
            rows={3}
            aria-invalid={editError ? true : undefined}
            className={`w-full border border-hairline bg-canvas px-4 py-3 body-md text-ink focus:border-2 focus:border-primary ${
              editError ? 'border-error' : ''
            }`}
          />
          {editError && (
            <p className="caption-sm mt-2 text-error" role="alert">
              {editError}
            </p>
          )}
          <div className="mt-3 flex gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button
              variant="outline"
              disabled={isSaving}
              onClick={() => {
                setIsEditing(false)
                setEditBody(comment.body)
                setEditError('')
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="body-sm mt-3 whitespace-pre-line text-body">{comment.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <HeartButton
              commentId={comment.id}
              heartCount={comment.heart_count}
              hasHearted={comment.hasHearted}
              label={`${comment.author_name}'s comment`}
            />
            {isOwner && !isConfirmingDelete && (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true)
                    setEditBody(comment.body)
                  }}
                  className="button-sm text-mute transition-colors hover:text-primary"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="button-sm text-error transition-colors hover:text-error-deep"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {isConfirmingDelete && (
        <DeleteInlineConfirm
          prompt="Remove this comment?"
          confirmLabel="Yes, remove it"
          pendingLabel="Removing…"
          isPending={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      )}
    </li>
  )
}

export default CommentItem
