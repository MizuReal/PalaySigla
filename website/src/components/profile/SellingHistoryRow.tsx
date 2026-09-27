import { useEffect, useState } from 'react'
import { getListingImageUrl } from '../../services/listings'
import {
  CATEGORY_LABELS,
  formatDate,
  formatPrice,
  UNIT_LABELS,
} from '../../utils/format'
import type { ListingWithImages, TransactionRow } from '../../types/domain'

const ROW_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESERVED: 'reserved',
  SOLD: 'sold',
  DELETED: 'deleted',
} as const)

type RowStatus = (typeof ROW_STATUS)[keyof typeof ROW_STATUS]

const STATUS_LABELS: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: 'Active',
  [ROW_STATUS.RESERVED]: 'Reserved',
  [ROW_STATUS.SOLD]: 'Sold',
  [ROW_STATUS.DELETED]: 'Deleted',
})

const STATUS_TEXT_CLASSES: Record<RowStatus, string> = Object.freeze({
  [ROW_STATUS.ACTIVE]: 'text-primary',
  [ROW_STATUS.RESERVED]: 'text-ink',
  [ROW_STATUS.SOLD]: 'text-ink',
  [ROW_STATUS.DELETED]: 'text-mute',
})

function resolveStatus(listing: ListingWithImages): RowStatus {
  if (listing.deleted_at) {
    return ROW_STATUS.DELETED
  }
  if (listing.status === 'sold') {
    return ROW_STATUS.SOLD
  }
  return listing.status === 'reserved' ? ROW_STATUS.RESERVED : ROW_STATUS.ACTIVE
}

function buildDateSummary(listing: ListingWithImages): string {
  const parts = [`Listed ${formatDate(listing.created_at)}`]
  if (listing.reserved_at) {
    parts.push(`Reserved ${formatDate(listing.reserved_at)}`)
  }
  if (listing.sold_at) {
    parts.push(`Sold ${formatDate(listing.sold_at)}`)
  }
  if (listing.deleted_at) {
    parts.push(`Deleted ${formatDate(listing.deleted_at)}`)
  }
  return parts.join(' · ')
}

function buildTransactionLine(listing: ListingWithImages): string {
  if (listing.status === 'sold' && listing.sold_to_name) {
    return `Sold to ${listing.sold_to_name}`
  }
  if (listing.status === 'reserved' && listing.reserved_for_name) {
    return `Reserved for ${listing.reserved_for_name}`
  }
  return ''
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
  transaction?: TransactionRow | null
  hasReviewed?: boolean
  onReview?: (transaction: TransactionRow) => void
}

function SellingHistoryRow({
  listing,
  onSelect,
  transaction = null,
  hasReviewed = false,
  onReview,
}: SellingHistoryRowProps) {
  const status = resolveStatus(listing)
  const image = listing.listing_images?.[0]
  const transactionLine = buildTransactionLine(listing)

  const showReview =
    status === ROW_STATUS.SOLD &&
    transaction !== null &&
    transaction.buyer_id !== null &&
    onReview !== undefined

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
        {transactionLine && (
          <p className="caption-sm mt-1 text-ink">{transactionLine}</p>
        )}
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
    <div className="border border-hairline bg-canvas">
      <button
        type="button"
        onClick={() => onSelect(listing)}
        className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-surface-soft"
      >
        {rowContent}
      </button>
      {showReview && transaction && onReview && (
        <div className="border-t border-hairline px-4 py-3">
          {hasReviewed ? (
            <p className="caption-sm text-primary">Reviewed</p>
          ) : (
            <button
              type="button"
              onClick={() => onReview(transaction)}
              className="h-10 border border-primary px-4 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary"
            >
              Leave a review
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default SellingHistoryRow
