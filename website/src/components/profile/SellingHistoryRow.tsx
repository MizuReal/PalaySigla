import { useEffect, useState } from 'react'
import { getListingImageUrl } from '../../services/listings.js'
import {
  CATEGORY_LABELS,
  formatDate,
  formatPrice,
  UNIT_LABELS,
} from '../../utils/format.js'
import type { ListingWithImages } from '../../types/domain'

const ROW_STATUS = Object.freeze({
  ACTIVE: 'active',
  SOLD: 'sold',
  DELETED: 'deleted',
} as const)

type RowStatus = (typeof ROW_STATUS)[keyof typeof ROW_STATUS]

const STATUS_LABELS: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: 'Active',
  [ROW_STATUS.SOLD]: 'Sold',
  [ROW_STATUS.DELETED]: 'Deleted',
})

const STATUS_TEXT_CLASSES: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: 'text-primary',
  [ROW_STATUS.SOLD]: 'text-ink',
  [ROW_STATUS.DELETED]: 'text-mute',
})

function resolveStatus(listing: ListingWithImages): RowStatus {
  if (listing.deleted_at) {
    return ROW_STATUS.DELETED
  }
  return listing.status === 'sold' ? ROW_STATUS.SOLD : ROW_STATUS.ACTIVE
}

function buildDateSummary(listing: ListingWithImages): string {
  const parts = [`Listed ${formatDate(listing.created_at)}`]
  if (listing.sold_at) {
    parts.push(`Sold ${formatDate(listing.sold_at)}`)
  }
  if (listing.deleted_at) {
    parts.push(`Deleted ${formatDate(listing.deleted_at)}`)
  }
  return parts.join(' · ')
}

function HistoryThumbnail({
  storagePath,
  title,
}: {
  storagePath: string
  title: string
}) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      if (!storagePath) {
        return
      }
      try {
        const url = await getListingImageUrl(storagePath)
        if (isCurrent) {
          setImageUrl(url)
        }
      } catch {
        // the surface-soft placeholder below covers a failed photo
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [storagePath])

  if (!imageUrl) {
    return (
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-24 shrink-0 border border-hairline bg-surface-soft"
      />
    )
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      loading="lazy"
      className="aspect-[4/3] w-24 shrink-0 border border-hairline object-cover"
    />
  )
}

interface SellingHistoryRowProps {
  listing: ListingWithImages
  onSelect: (listing: ListingWithImages) => void
}

function SellingHistoryRow({ listing, onSelect }: SellingHistoryRowProps) {
  const status = resolveStatus(listing)
  const image = listing.listing_images?.[0]

  const rowContent = (
    <>
      <HistoryThumbnail
        storagePath={image?.storage_path ?? ''}
        title={listing.title}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="card-title text-ink">{listing.title}</span>
          <span className="rounded-sm border border-hairline bg-surface-soft px-3 py-1">
            <span className={`caption-md ${STATUS_TEXT_CLASSES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </span>
        </div>
        <p className="mt-1 text-ink">
          <span className="heading-sm text-primary">
            {formatPrice(listing.price ?? 0)}
          </span>{' '}
          <span className="caption-sm text-mute">{UNIT_LABELS[listing.unit]}</span>
        </p>
        <p className="caption-sm mt-1 text-mute">
          {CATEGORY_LABELS[listing.category]} · {buildDateSummary(listing)}
        </p>
      </div>
    </>
  )

  if (status === ROW_STATUS.DELETED) {
    return (
      <div className="flex items-start gap-4 border border-hairline bg-canvas p-4">
        {rowContent}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(listing)}
      className="flex w-full items-start gap-4 border border-hairline bg-canvas p-4 text-left transition-colors hover:border-primary"
    >
      {rowContent}
    </button>
  )
}

export default SellingHistoryRow
