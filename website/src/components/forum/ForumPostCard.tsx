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

// Feed post in the social-feed idiom: a header (author + category), the title
// over a clamped body, an edge-to-edge first photo, and a two-segment action
// bar. The whole card opens the thread; each action is its own target.
function ForumPostCard({ post, onSelect }: ForumPostCardProps) {
  const commentLabel = `${post.comment_count} comment${
    post.comment_count === 1 ? '' : 's'
  }`

  return (
    <article
      onClick={() => onSelect(post.id)}
      className="cursor-pointer overflow-hidden border border-hairline bg-canvas transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6">
        <AuthorBadge
          name={post.author_name}
          timestamp={post.created_at}
          isEdited={post.updated_at !== null}
        />
        <span className="shrink-0 rounded-sm bg-surface-soft px-2.5 py-1 caption-md text-body">
          {FORUM_CATEGORY_LABELS[post.category]}
        </span>
      </div>

      <div className="px-6">
        <h2 className="card-title text-ink">
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
        <p className="mt-2 body-sm line-clamp-4 whitespace-pre-line text-body">
          {post.body}
        </p>
      </div>

      {post.forum_images[0] && (
        <div className="mt-4">
          <ForumPostImage
            image={post.forum_images[0]}
            alt="Photo attached to this discussion"
            aspectClass="aspect-[4/3]"
            className="border-none max-h-64 sm:max-h-96"
          />
        </div>
      )}

      <div className="mt-4 flex items-stretch border-t border-hairline">
        <span className="flex flex-1" onClick={(event) => event.stopPropagation()}>
          <HeartButton
            postId={post.id}
            heartCount={post.heart_count}
            hasHearted={post.hasHearted}
            label="this discussion"
            variant="bar"
          />
        </span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onSelect(post.id)
          }}
          className="flex h-11 flex-1 items-center justify-center gap-2 border-l border-hairline button-sm text-mute transition-colors hover:text-primary"
        >
          <Icon name="chat" className="h-5 w-5" />
          <span aria-hidden="true">{post.comment_count}</span>
          <span className="sr-only">{commentLabel}</span>
        </button>
      </div>
    </article>
  )
}

export default ForumPostCard
