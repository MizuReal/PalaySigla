import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Icon from '../components/Icon'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import AuthorBadge from '../components/forum/AuthorBadge'
import CommentComposer from '../components/forum/CommentComposer'
import CommentItem from '../components/forum/CommentItem'
import DeleteInlineConfirm from '../components/forum/DeleteInlineConfirm'
import HeartButton from '../components/forum/HeartButton'
import PostEditorModal from '../components/forum/PostEditorModal'
import useForumComments from '../hooks/useForumComments'
import useForumPost from '../hooks/useForumPost'
import { useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import { softDeleteForumPost } from '../services/forum'

const COMMENT_SKELETON_COUNT = 3

interface ForumCommentsProps {
  postId: string
  onChanged: () => void
}

function ForumComments({ postId, onChanged }: ForumCommentsProps) {
  const {
    comments,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
  } = useForumComments(postId)

  const handleChanged = () => {
    refresh()
    onChanged()
  }

  const renderComments = () => {
    if (isInitialLoading) {
      return (
        <div className="space-y-5">
          {Array.from({ length: COMMENT_SKELETON_COUNT }, (_, index) => (
            <div key={index} className="border-t border-hairline pt-5">
              <div className="h-3 w-40 animate-pulse bg-surface-soft" />
              <div className="mt-3 h-3 w-full animate-pulse bg-surface-soft" />
              <div className="mt-2 h-3 w-2/3 animate-pulse bg-surface-soft" />
            </div>
          ))}
        </div>
      )
    }
    if (error) {
      return (
        <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
          <p className="body-strong text-ink">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    if (comments.length === 0) {
      return (
        <p className="body-sm text-mute">
          No comments yet. Add the first one above.
        </p>
      )
    }
    return (
      <>
        <ul>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onChanged={handleChanged} />
          ))}
        </ul>
        {hasMore && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="h-11 border border-hairline bg-canvas px-6 button-md text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
            >
              {isLoadingMore ? 'Loading more…' : 'Load more'}
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <section className="mt-10 border-t border-hairline pt-8">
      <h2 className="heading-md text-ink">
        {isInitialLoading ? 'Comments' : `${total} comment${total === 1 ? '' : 's'}`}
      </h2>
      <CommentComposer postId={postId} onPosted={handleChanged} />
      <div className="mt-6">{renderComments()}</div>
    </section>
  )
}

function ForumPostPage() {
  const { postId = '' } = useParams<{ postId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { showToast } = useToast()
  const { post, isLoading, error, refresh } = useForumPost(postId)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwner = user !== null && post !== null && post.user_id === user.id

  const handleRemove = async () => {
    if (!post) {
      return
    }
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true)
      return
    }
    setIsDeleting(true)
    try {
      await softDeleteForumPost(post.id)
      showToast('Discussion removed.', TOAST_VARIANTS.SUCCESS)
      navigate('/forum')
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : 'Could not remove the discussion. Please try again.',
        TOAST_VARIANTS.ERROR
      )
      setIsDeleting(false)
      setIsConfirmingDelete(false)
    }
  }

  const renderPost = () => {
    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-3 w-40 bg-surface-soft" />
          <div className="h-6 w-2/3 bg-surface-soft" />
          <div className="h-4 w-full bg-surface-soft" />
          <div className="h-4 w-4/5 bg-surface-soft" />
        </div>
      )
    }
    if (error || !post) {
      return (
        <div className="py-4 text-center" role="alert">
          <p className="body-strong text-ink">
            {error || 'That discussion could not be found.'}
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" to="/forum">
              Back to forum
            </Button>
          </div>
        </div>
      )
    }
    return (
      <>
        <AuthorBadge
          name={post.author_name}
          timestamp={post.created_at}
          isEdited={post.updated_at !== null}
        />
        <h1 className="heading-xl mt-4 text-ink">{post.title}</h1>
        <p className="body-md mt-4 whitespace-pre-line text-body">{post.body}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <HeartButton
            postId={post.id}
            heartCount={post.heart_count}
            hasHearted={post.hasHearted}
            label="this discussion"
          />
          {isOwner && !isConfirmingDelete && (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="button-sm text-mute transition-colors hover:text-primary"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="button-sm text-error transition-colors hover:text-error-deep"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        {isConfirmingDelete && (
          <DeleteInlineConfirm
            prompt="Remove this discussion? Its comments will be hidden too."
            confirmLabel="Yes, remove it"
            pendingLabel="Removing…"
            isPending={isDeleting}
            onConfirm={handleRemove}
            onCancel={() => setIsConfirmingDelete(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PrimaryNav />
      <main>
        <Container className="py-10 md:py-[64px]">
          <Link
            to="/forum"
            className="inline-flex items-center gap-1.5 button-sm text-primary transition-colors hover:text-primary-dark"
          >
            <Icon name="chevron-left" className="h-4 w-4" />
            Back to forum
          </Link>
          <article className="mt-6 border border-hairline bg-canvas p-6 sm:p-8">
            {renderPost()}
          </article>
          {post && !isLoading && (
            <ForumComments postId={post.id} onChanged={refresh} />
          )}
        </Container>
      </main>
      <Footer />
      {isEditOpen && post && (
        <PostEditorModal
          post={post}
          onClose={() => setIsEditOpen(false)}
          onSaved={() => {
            setIsEditOpen(false)
            refresh()
          }}
        />
      )}
    </>
  )
}

export default ForumPostPage
