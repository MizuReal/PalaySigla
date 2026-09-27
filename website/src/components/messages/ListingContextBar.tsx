import Icon from '../Icon'
import Photo from '../Photo'
import { CATEGORY_LABELS, formatPrice, UNIT_LABELS } from '../../utils/format'
import { CATEGORY_ICONS } from '../../utils/listingIcons'
import type { ListingWithImages } from '../../types/domain'

interface ListingContextBarProps {
  title: string
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  isUnavailable: boolean
  onOpen?: () => void
}

// Slim product context pinned under the thread header: a 40px thumbnail, the
// title + price, and the per-category tag. Tapping opens the listing when it
// is still available. Replaces the former tall inquiry card so the transcript
// keeps the vertical space.
function ListingContextBar({
  title,
  listing,
  imageUrl,
  isLoading,
  isUnavailable,
  onOpen,
}: ListingContextBarProps) {
  const hasListing = Boolean(listing) && !isLoading && !isUnavailable
  const isInteractive = Boolean(onOpen) && hasListing

  const content = (
    <>
      <div className="w-10 shrink-0">
        <Photo
          src={imageUrl}
          alt={title}
          fallbackLabel={title}
          aspectClass="aspect-square"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="card-title truncate text-ink">{title}</p>
        {isLoading ? (
          <div className="mt-1.5 space-y-1.5" aria-hidden="true">
            <div className="h-3.5 w-24 animate-pulse bg-canvas" />
            <div className="h-3.5 w-16 animate-pulse bg-canvas" />
          </div>
        ) : !listing || isUnavailable ? (
          <p className="caption-sm mt-1 text-mute">This listing is no longer available.</p>
        ) : (
          <p className="mt-0.5 truncate">
            <span className="body-strong text-primary">
              {formatPrice(listing.price ?? 0)}
            </span>{' '}
            <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
          </p>
        )}
      </div>
      {hasListing && listing && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-0.5">
          <Icon
            name={CATEGORY_ICONS[listing.category]}
            className="h-3.5 w-3.5 shrink-0 text-on-primary"
          />
          <span className="caption-xs text-on-primary">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </span>
      )}
      {isInteractive && (
        <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-mute" />
      )}
    </>
  )

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open listing: ${title}`}
        className="flex w-full items-center gap-3 border-b border-hairline bg-surface-soft px-4 py-2.5 text-left transition-colors hover:bg-canvas md:px-5"
      >
        {content}
      </button>
    )
  }

  return (
    <div
      aria-label={`Product this conversation is about: ${title}`}
      className="flex w-full items-center gap-3 border-b border-hairline bg-surface-soft px-4 py-2.5 md:px-5"
    >
      {content}
    </div>
  )
}

export default ListingContextBar
