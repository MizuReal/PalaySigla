import { useMemo } from 'react'
import Icon from '../Icon'
import RatingStars from './RatingStars'
import ReviewItem from './ReviewItem'
import useUserReviews from '../../hooks/useUserReviews'
import { useAuth } from '../../context/authContext'
import { MAX_RATING } from '../../services/reviews'

const STAR_SCALE = Array.from({ length: MAX_RATING }, (_, index) => MAX_RATING - index)

interface ReviewsCardProps {
  ratingAvg?: number
  ratingCount?: number
  userId?: string
}

function ReviewsCard({ ratingAvg = 0, ratingCount = 0, userId }: ReviewsCardProps) {
  const { user } = useAuth()
  const targetUserId = userId ?? user?.id ?? null
  const isOwnProfile = !userId || userId === user?.id
  const { reviews, isInitialLoading, error, refresh } = useUserReviews(targetUserId)

  const distribution = useMemo(() => {
    const counts = new Map<number, number>(STAR_SCALE.map((stars) => [stars, 0]))
    for (const review of reviews) {
      const stars = Math.min(Math.max(Math.round(review.rating), 1), MAX_RATING)
      counts.set(stars, (counts.get(stars) ?? 0) + 1)
    }
    return counts
  }, [reviews])

  const totalRated = reviews.length

  const renderList = () => {
    if (isInitialLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="h-14 animate-pulse bg-surface-soft" />
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
        <div className="flex items-start gap-3">
          <Icon name="star" className="mt-0.5 h-4 w-4 shrink-0 text-stone" />
          <p className="body-sm text-body">
            {isOwnProfile
              ? 'No reviews yet. Ratings from buyers and sellers you transact with will show up here.'
              : 'No reviews yet for this farmer.'}
          </p>
        </div>
      )
    }
    return (
      <div>
        {reviews.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>
    )
  }

  return (
    <section className="border border-hairline bg-canvas p-5" aria-label="Ratings and reviews">
      <h2 className="heading-sm text-ink">Ratings &amp; reviews</h2>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <RatingStars rating={Math.round(ratingAvg)} />
        <p className="body-strong text-ink">
          {ratingAvg.toFixed(1)}
          <span className="body-sm font-normal text-mute"> / {MAX_RATING}</span>
        </p>
        <p className="caption-sm text-mute">
          {ratingCount} rating{ratingCount === 1 ? '' : 's'}
        </p>
      </div>
      {totalRated > 0 && (
        <div className="mt-4 space-y-1.5">
          {STAR_SCALE.map((stars) => {
            const count = distribution.get(stars) ?? 0
            const percent = Math.round((count / totalRated) * 100)
            return (
              <div key={stars} className="flex items-center gap-2">
                <span className="caption-sm w-3 text-right text-mute">{stars}</span>
                <Icon name="star" filled className="h-3 w-3 shrink-0 text-primary" />
                <div className="h-1.5 flex-1 bg-surface-soft">
                  <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                </div>
                <span className="caption-sm w-5 text-right text-mute">{count}</span>
              </div>
            )
          })}
        </div>
      )}
      <div className="mt-4 border-t border-hairline pt-3">{renderList()}</div>
    </section>
  )
}

export default ReviewsCard
