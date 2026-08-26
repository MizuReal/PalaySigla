import { useEffect, useState } from 'react'
import Icon from '../Icon.jsx'
import Photo from '../Photo.jsx'
import { getListingImageUrl } from '../../services/listings.js'
import {
  CATEGORY_LABELS,
  formatPrice,
  formatRelativeTime,
  UNIT_LABELS,
} from '../../utils/format.js'

function ListingCard({ listing, onSelect }) {
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
      className="flex cursor-pointer flex-col border border-hairline bg-canvas transition-colors hover:border-primary"
    >
      <div className="relative">
        <Photo
          src={imageUrl}
          alt={listing.title}
          fallbackLabel={listing.title}
          aspectClass="aspect-[4/3]"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-sm border border-hairline bg-canvas px-3 py-1.5">
          <span className="caption-md text-primary">
            {CATEGORY_LABELS[listing.category]}
          </span>
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="card-title text-ink">{listing.title}</h3>
        <p className="mt-1 text-ink">
          <span className="heading-sm text-primary">
            {formatPrice(listing.price)}
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
