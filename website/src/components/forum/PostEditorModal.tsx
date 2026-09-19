import { useState } from 'react'
import Button from '../Button'
import Icon from '../Icon'
import Modal from '../Modal'
import ForumImageUploader from './ForumImageUploader'
import useForumPostEditor from '../../hooks/useForumPostEditor'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { FORUM_CATEGORIES } from '../../services/forum'
import type { ForumCategory } from '../../services/forum'
import { FORUM_CATEGORY_LABELS } from '../../utils/forumCategories'
import { validateForumPost } from '../../utils/forumValidation'
import type { ForumPostErrors } from '../../utils/forumValidation'
import type { ForumPostSummary } from '../../types/domain'

const MODAL_TITLE_ID = 'forum-editor-title'
const TITLE_FIELD_ID = 'forum-post-title'
const CATEGORY_FIELD_ID = 'forum-post-category'
const BODY_FIELD_ID = 'forum-post-body'
const DEFAULT_CATEGORY: ForumCategory = 'general'

const FIELD_CLASSES =
  'mt-2 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary'

interface PostEditorModalProps {
  post?: ForumPostSummary | null
  onClose: () => void
  onSaved: () => void
}

function PostEditorModal({ post = null, onClose, onSaved }: PostEditorModalProps) {
  const { showToast } = useToast()
  const { savePost, isSubmitting, error } = useForumPostEditor(post)
  const isEditing = post !== null

  const [title, setTitle] = useState(post?.title ?? '')
  const [category, setCategory] = useState<ForumCategory>(
    post?.category ?? DEFAULT_CATEGORY
  )
  const [body, setBody] = useState(post?.body ?? '')
  const [newImages, setNewImages] = useState<Blob[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [errors, setErrors] = useState<ForumPostErrors>({})

  const handleToggleExisting = (imageId: string) => {
    setRemovedImageIds((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId]
    )
  }

  const handleSubmit = async () => {
    const validation = validateForumPost({ title, body, category })
    setErrors(validation)
    if (validation.title) {
      document.getElementById(TITLE_FIELD_ID)?.focus()
      return
    }
    if (validation.category) {
      document.getElementById(CATEGORY_FIELD_ID)?.focus()
      return
    }
    if (validation.body) {
      document.getElementById(BODY_FIELD_ID)?.focus()
      return
    }
    try {
      await savePost({ title, body, category, newImages, removedImageIds })
      showToast(
        isEditing ? 'Discussion updated.' : 'Discussion published!',
        TOAST_VARIANTS.SUCCESS
      )
      onSaved()
    } catch {
      // the hook surfaces the friendly message in its error state
    }
  }

  return (
    <Modal
      onClose={onClose}
      labelledBy={MODAL_TITLE_ID}
      panelClassName="max-w-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
    >
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
          <label htmlFor={CATEGORY_FIELD_ID} className="caption-md text-ink">
            Category
          </label>
          <select
            id={CATEGORY_FIELD_ID}
            value={category}
            onChange={(event) => {
              // the options below are exactly the ForumCategory values
              setCategory(event.target.value as ForumCategory)
              setErrors((current) => ({ ...current, category: undefined }))
            }}
            aria-invalid={errors.category ? true : undefined}
            className={`${FIELD_CLASSES} h-11 ${errors.category ? 'border-error' : ''}`}
          >
            {FORUM_CATEGORIES.map((categoryKey) => (
              <option key={categoryKey} value={categoryKey}>
                {FORUM_CATEGORY_LABELS[categoryKey]}
              </option>
            ))}
          </select>
          {errors.category && (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.category}
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
        <div>
          <p className="caption-md text-ink">Photos</p>
          <div className="mt-2">
            <ForumImageUploader
              existingImages={post?.forum_images ?? []}
              removedImageIds={removedImageIds}
              onToggleExisting={handleToggleExisting}
              onNewFilesChange={setNewImages}
              error=""
            />
          </div>
        </div>
      </div>

      {error && (
        <div
          className="mt-6 flex items-start gap-3 border border-error bg-surface-soft p-4"
          role="alert"
        >
          <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
          <p className="body-sm text-ink">{error}</p>
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
