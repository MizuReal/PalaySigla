import Icon from '../Icon'
import { MAX_RATING } from '../../services/reviews'

interface StarRatingInputProps {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

// Interactive 1–5 star control; each star is a 44px radio.
function StarRatingInput({ value, onChange, disabled = false }: StarRatingInputProps) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1">
      {Array.from({ length: MAX_RATING }, (_, index) => {
        const rating = index + 1
        const isFilled = rating <= value
        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
            disabled={disabled}
            onClick={() => onChange(rating)}
            className="flex h-11 w-11 items-center justify-center transition-opacity disabled:opacity-50"
          >
            <Icon
              name="star"
              filled={isFilled}
              className={`h-7 w-7 ${isFilled ? 'text-primary' : 'text-stone'}`}
            />
          </button>
        )
      })}
      <span className="caption-md ml-2 text-ink" aria-live="polite">
        {value > 0 ? `${value} / ${MAX_RATING}` : `0 / ${MAX_RATING}`}
      </span>
    </div>
  )
}

export default StarRatingInput
