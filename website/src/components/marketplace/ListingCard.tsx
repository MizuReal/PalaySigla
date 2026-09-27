import { useEffect, useState } from 'react'
import Icon from '../Icon'
import Photo from '../Photo'
import { getListingImageUrl } from '../../services/listings'
import {
  CATEGORY_LABELS,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../../utils/format'
import { CATEGORY_ICONS } from '../../utils/listingIcons'
import type { ListingWithImages } from '../../types/domain'

interface ListingCardProps {
  listing: ListingWithImages
  onSelect: (listing: ListingWithImages) => void
}

function ListingCard({ listing, onSelect }: ListingCardProps) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    const loadImage = async () => {
      const image = listing.listing_images?.[0]
      if (!image) {
        return
      }
      try {
        const url = await getListingImageUrl(image.storage_path)
        if (isCurrent) {
          setImageUrl(url)
        }
      } catch {
        // fallback label in the card covers the failed photo
      }
    }
    loadImage()
    return () => {
      isCurrent = false
    }
  }, [listing])

  return (
    <article
      onClick={() => onSelect(listing)}
      className="flex cursor-pointer flex-col border border-hairline bg-canvas shadow-card transition-[border-color,box-shadow] hover:border-primary hover:shadow-card-hover"
    >
      <div className="relative">
        <Photo
          src={imageUrl}
          alt={listing.title}
          fallbackLabel={listing.title}
          aspectClass="aspect-[4/3]"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1">
          <Icon
            name={CATEGORY_ICONS[listing.category]}
            className="h-3.5 w-3.5 shrink-0 text-on-primary"
          />
          <span className="caption-md text-on-primary">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </span>
        {listing.status === 'reserved' && (
          <span className="absolute right-3 top-3 rounded-full border border-ink bg-ink px-3 py-1">
            <span className="caption-md text-on-dark">Reserved</span>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="card-title line-clamp-2 text-ink">{listing.title}</h3>
        <p className="mt-1 text-ink">
          <span className="heading-sm text-primary">
            {formatPrice(listing.price ?? 0)}
          </span>{' '}
          <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
        </p>
        <p className="mt-3 flex items-center gap-1.5 text-mute">
          <Icon name="pin" className="h-4 w-4 shrink-0" />
          <span className="caption-sm">
            {listing.location_label} · {formatRelativeTime(listing.created_at)}
          </span>
        </p>
      </div>
    </article>
  )
}

export default ListingCard
