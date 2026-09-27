import Icon from '../Icon'
import ReviewItem from './ReviewItem'
import useUserReviews from '../../hooks/useUserReviews'
import { useAuth } from '../../context/authContext'

const MAX_RATING = 5
const STAR_GLYPH_COUNT = MAX_RATING

function StarRow({ ratingAvg }: { ratingAvg: number }) {
  const filledStars = Math.round(ratingAvg)
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: STAR_GLYPH_COUNT }, (_, index) => (
        <Icon
          key={index}
          name="star"
          filled={index < filledStars}
          className={`h-4 w-4 ${
            index < filledStars ? 'text-primary' : 'text-stone'
          }`}
        />
      ))}
    </div>
  )
}

interface ReviewsCardProps {
  ratingAvg?: number
  ratingCount?: number
}

function ReviewsCard({ ratingAvg = 0, ratingCount = 0 }: ReviewsCardProps) {
  const { user } = useAuth()
  const { reviews, isInitialLoading, error, refresh } = useUserReviews(user?.id ?? null)

  const renderList = () => {
    if (isInitialLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse bg-surface-soft" />
          ))}
        </div>
      )
    }
    if (error) {
      return (
        <div role="alert">
          <p className="body-sm text-error">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="body-sm mt-2 text-link-blue transition-colors hover:text-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    if (reviews.length === 0) {
      return (
        <p className="body-sm text-body">
          No reviews yet. Ratings from buyers and sellers you transact with will
          show up here.
        </p>
      )
    }
    return (
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
    )
  }

  return (
    <section className="border border-hairline bg-canvas p-6">
      <h2 className="heading-sm text-ink">Ratings &amp; reviews</h2>
      <div className="mt-5 flex items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <StarRow ratingAvg={ratingAvg} />
          <p className="caption-sm text-mute">
            {ratingCount} rating{ratingCount === 1 ? '' : 's'}
          </p>
        </div>
        <p className="body-strong text-ink">
          {ratingAvg.toFixed(1)}
          <span className="body-sm font-normal text-mute"> / {MAX_RATING}</span>
        </p>
      </div>
      <div className="mt-5 border-t border-hairline pt-5">{renderList()}</div>
    </section>
  )
}

export default ReviewsCard
