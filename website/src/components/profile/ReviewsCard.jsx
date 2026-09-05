import Icon from '../Icon.jsx'

const MAX_RATING = 5
const STAR_GLYPH_COUNT = MAX_RATING

function StarRow({ ratingAvg }) {
  const filledStars = Math.round(ratingAvg)
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {Array.from({ length: STAR_GLYPH_COUNT }, (_, index) => (
        <Icon
          key={index}
          name="star"
          className={`h-4 w-4 ${
            index < filledStars ? 'text-primary' : 'text-stone'
          }`}
        />
      ))}
    </div>
  )
}

function ReviewsCard({ ratingAvg = 0, ratingCount = 0 }) {
  const hasRatings = ratingCount > 0

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
          <span className="body-sm font-normal text-mute">
            {' '}
            / {MAX_RATING}
          </span>
        </p>
      </div>
      <div className="mt-5 border-t border-hairline pt-5">
        {hasRatings ? (
          <>
            <p className="body-sm text-body">
              Written reviews from marketplace buyers will appear here.
            </p>
            <p className="caption-sm mt-3 flex items-center gap-1.5 text-mute">
              <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
              Reviews open with the next release.
            </p>
          </>
        ) : (
          <>
            <p className="body-sm text-body">
              No reviews yet. Ratings from buyers on your marketplace
              transactions will show up here.
            </p>
            <p className="caption-sm mt-3 flex items-center gap-1.5 text-mute">
              <Icon name="info" className="h-3.5 w-3.5 shrink-0" />
              Reviews open with the next release.
            </p>
          </>
        )}
      </div>
    </section>
  )
}

export default ReviewsCard
