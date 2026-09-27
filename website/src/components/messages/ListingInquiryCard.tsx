import Photo from '../Photo'
import { CATEGORY_LABELS, formatPrice, UNIT_LABELS } from '../../utils/format'
import type { ListingWithImages } from '../../types/domain'

interface ListingInquiryCardProps {
  title: string
  listing: ListingWithImages | null
  imageUrl: string
  isLoading: boolean
  isUnavailable: boolean
}

// Read-only product context pinned at the top of a listing conversation, so
// both parties always know which listing the thread is about.
function ListingInquiryCard({
  title,
  listing,
  imageUrl,
  isLoading,
  isUnavailable,
}: ListingInquiryCardProps) {
  return (
    <section
      aria-label="Product this conversation is about"
      className="mb-4 rounded-sm border border-hairline bg-surface-soft p-4"
    >
      <p className="caption-md text-primary">User inquired about this product</p>
      <div className="mt-3 flex gap-4">
        <div className="w-20 shrink-0">
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
            <div className="mt-2 space-y-2" aria-hidden="true">
              <div className="h-4 w-1/3 animate-pulse bg-canvas" />
              <div className="h-4 w-1/4 animate-pulse bg-canvas" />
            </div>
          ) : isUnavailable || !listing ? (
            <p className="body-sm mt-2 text-mute">This listing is no longer available.</p>
          ) : (
            <>
              <p className="mt-2 text-ink">
                <span className="heading-md text-primary">
                  {formatPrice(listing.price ?? 0)}
                </span>{' '}
                <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
              </p>
              <span className="mt-2 inline-block rounded-sm border border-hairline bg-canvas px-3 py-1.5">
                <span className="caption-md text-ink">{CATEGORY_LABELS[listing.category]}</span>
              </span>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

export default ListingInquiryCard
