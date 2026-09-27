import Icon from '../Icon'
import { MAX_RATING } from '../../services/reviews'

interface RatingStarsProps {
  rating: number
  starClassName?: string
}

function RatingStars({ rating, starClassName = 'h-4 w-4' }: RatingStarsProps) {
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
          className={`${starClassName} ${index < rating ? 'text-primary' : 'text-stone'}`}
        />
      ))}
    </div>
  )
}

export default RatingStars
