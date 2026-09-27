import Icon from '../Icon'
import { formatDate } from '../../utils/format'
import { MAX_RATING } from '../../services/reviews'
import type { ReviewRow } from '../../types/domain'

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`${rating} out of ${MAX_RATING}`}
    >
      {Array.from({ length: MAX_RATING }, (_, index) => (
        <Icon
          key={index}
          name="star"
          filled={index < rating}
          className={`h-4 w-4 ${index < rating ? 'text-primary' : 'text-stone'}`}
        />
      ))}
    </div>
  )
}

function ReviewItem({ review }: { review: ReviewRow }) {
  return (
    <article className="border-t border-hairline pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-3">
        <p className="body-strong text-ink">{review.reviewer_name}</p>
        <p className="caption-sm text-mute">{formatDate(review.created_at)}</p>
      </div>
      <div className="mt-1.5">
        <ReviewStars rating={review.rating} />
      </div>
      <p className="caption-sm mt-1 text-mute">on {review.listing_title}</p>
      {review.comment && (
        <p className="body-sm mt-2 whitespace-pre-line text-body">{review.comment}</p>
      )}
    </article>
  )
}

export default ReviewItem
export { ReviewStars }
