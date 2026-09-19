import AuthorBadge from './AuthorBadge'
import ForumPostImage from './ForumPostImage'
import HeartButton from './HeartButton'
import Icon from '../Icon'
import { FORUM_CATEGORY_LABELS } from '../../utils/forumCategories'
import type { ForumPostSummary } from '../../types/domain'

interface ForumPostCardProps {
  post: ForumPostSummary
  onSelect: (postId: string) => void
}

function ForumPostCard({ post, onSelect }: ForumPostCardProps) {
  return (
    <article
      onClick={() => onSelect(post.id)}
      className="cursor-pointer border border-hairline bg-canvas p-6 transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <AuthorBadge
          name={post.author_name}
          timestamp={post.created_at}
          isEdited={post.updated_at !== null}
        />
        <span className="shrink-0 rounded-sm bg-surface-soft px-2.5 py-1 caption-md text-body">
          {FORUM_CATEGORY_LABELS[post.category]}
        </span>
      </div>
      <h2 className="card-title mt-4 text-ink">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect(post.id)
          }}
          className="text-left transition-colors hover:text-primary"
        >
          {post.title}
        </button>
      </h2>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row">
        <p className="body-sm line-clamp-3 flex-1 whitespace-pre-line text-body">
          {post.body}
        </p>
        {post.forum_images[0] && (
          <ForumPostImage
            image={post.forum_images[0]}
            alt="Photo attached to this discussion"
            aspectClass="aspect-[4/3]"
            className="shrink-0 sm:w-44"
          />
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 border-t border-hairline pt-4">
        <span className="inline-flex" onClick={(event) => event.stopPropagation()}>
          <HeartButton
            postId={post.id}
            heartCount={post.heart_count}
            hasHearted={post.hasHearted}
            label="this discussion"
          />
        </span>
        <span className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline px-3 button-sm text-mute">
          <Icon name="chat" className="h-5 w-5" />
          <span aria-hidden="true">{post.comment_count}</span>
          <span className="sr-only">
            {post.comment_count} comment{post.comment_count === 1 ? '' : 's'}
          </span>
        </span>
      </div>
    </article>
  )
}

export default ForumPostCard
