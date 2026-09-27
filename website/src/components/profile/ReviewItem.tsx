import RatingStars from './RatingStars'
import { formatDate } from '../../utils/format'
import type { ReviewRow } from '../../types/domain'

function ReviewItem({ review }: { review: ReviewRow }) {
  return (
    <article className="border-t border-hairline py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <p className="body-strong text-ink">{review.reviewer_name}</p>
        <p className="caption-sm text-mute">{formatDate(review.created_at)}</p>
      </div>
      <div className="mt-1">
        <RatingStars rating={review.rating} starClassName="h-3.5 w-3.5" />
      </div>
      <p className="caption-sm mt-1 text-mute">on {review.listing_title}</p>
      {review.comment && (
        <p className="body-sm mt-1.5 whitespace-pre-line text-body">{review.comment}</p>
      )}
    </article>
  )
}

export default ReviewItem
