import { Link } from 'react-router-dom'
import AuthorBadge from './AuthorBadge'
import HeartButton from './HeartButton'
import Icon from '../Icon'
import type { ForumPostSummary } from '../../types/domain'

interface ForumPostCardProps {
  post: ForumPostSummary
}

function ForumPostCard({ post }: ForumPostCardProps) {
  return (
    <article className="border border-hairline bg-canvas p-6 transition-colors hover:border-primary">
      <AuthorBadge
        name={post.author_name}
        timestamp={post.created_at}
        isEdited={post.updated_at !== null}
      />
      <h2 className="card-title mt-4 text-ink">
        <Link
          to={`/forum/${post.id}`}
          className="transition-colors hover:text-primary"
        >
          {post.title}
        </Link>
      </h2>
      <p className="body-sm mt-2 line-clamp-3 whitespace-pre-line text-body">
        {post.body}
      </p>
      <div className="mt-4 flex items-center gap-4 border-t border-hairline pt-4">
        <HeartButton
          postId={post.id}
          heartCount={post.heart_count}
          hasHearted={post.hasHearted}
          label="this discussion"
        />
        <Link
          to={`/forum/${post.id}`}
          aria-label={`${post.comment_count} comment${post.comment_count === 1 ? '' : 's'}`}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-hairline px-3 button-sm text-mute transition-colors hover:border-primary hover:text-primary"
        >
          <Icon name="chat" className="h-5 w-5" />
          <span aria-hidden="true">{post.comment_count}</span>
        </Link>
      </div>
    </article>
  )
}

export default ForumPostCard
