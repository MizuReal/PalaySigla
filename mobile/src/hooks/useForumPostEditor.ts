// Create/edit a discussion — port of website/src/hooks/useForumPostEditor.ts.
// New photos arrive as prepared (compressed) images rather than web Blobs; a
// failed upload on create rolls back the uploads and the photo-less post,
// mirroring the marketplace create-then-upload flow.
import { useCallback, useState } from 'react'
import {
  FORUM_MAX_IMAGES,
  createForumPost,
  deleteForumImage,
  markForumPostEdited,
  softDeleteForumPost,
  updateForumPost,
  uploadForumImage,
} from '../services/forum'
import type { ForumCategory } from '../services/forum'
import { useAuth } from '../context/authContext'
import { getDisplayName } from '../utils/userProfile'
import type { PreparedImage } from '../utils/image'
import type { ForumImageRef, ForumPostSummary } from '../types/domain'

export interface ForumPostEditorInput {
  title: string
  body: string
  category: ForumCategory
  newImages: PreparedImage[]
  removedImageIds: string[]
}

export interface UseForumPostEditorResult {
  savePost: (input: ForumPostEditorInput) => Promise<void>
  isSubmitting: boolean
  error: string
}

function nextImagePosition(keptImages: ForumImageRef[]): number {
  if (keptImages.length === 0) {
    return 0
  }
  return Math.max(...keptImages.map((image) => image.position)) + 1
}

function useForumPostEditor(
  post: ForumPostSummary | null = null
): UseForumPostEditorResult {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const savePost = useCallback(
    async ({
      title,
      body,
      category,
      newImages,
      removedImageIds,
    }: ForumPostEditorInput): Promise<void> => {
      if (!user) {
        throw new Error('You must be signed in to post a discussion.')
      }
      const keptImages = post
        ? post.forum_images.filter((image) => !removedImageIds.includes(image.id))
        : []
      if (keptImages.length + newImages.length > FORUM_MAX_IMAGES) {
        throw new Error(`You can add up to ${FORUM_MAX_IMAGES} photos.`)
      }
      setIsSubmitting(true)
      setError('')
      try {
        if (!post) {
          const postId = await createForumPost({
            userId: user.id,
            authorName: getDisplayName(user),
            title,
            body,
            category,
          })
          const uploaded: ForumImageRef[] = []
          try {
            for (const [index, image] of newImages.entries()) {
              uploaded.push(
                await uploadForumImage({
                  image,
                  postId,
                  userId: user.id,
                  position: index,
                })
              )
            }
          } catch (uploadError) {
            // roll back the uploads and the photo-less post
            for (const image of uploaded) {
              try {
                await deleteForumImage(image)
              } catch {
                // best effort; the upload failure is the one surfaced below
              }
            }
            try {
              await softDeleteForumPost(postId)
            } catch {
              // best effort; the upload failure is the one surfaced below
            }
            throw uploadError
          }
          return
        }

        const removedImages = post.forum_images.filter((image) =>
          removedImageIds.includes(image.id)
        )
        const contentChanged =
          title !== post.title || body !== post.body || category !== post.category
        await updateForumPost({ postId: post.id, title, body, category })
        for (const image of removedImages) {
          await deleteForumImage(image)
        }
        let position = nextImagePosition(keptImages)
        for (const image of newImages) {
          await uploadForumImage({ image, postId: post.id, userId: user.id, position })
          position += 1
        }
        if (
          (removedImages.length > 0 || newImages.length > 0) &&
          !contentChanged
        ) {
          await markForumPostEdited(post.id)
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Could not save the discussion. Please try again.'
        )
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [user, post]
  )

  return { savePost, isSubmitting, error }
}

export default useForumPostEditor
