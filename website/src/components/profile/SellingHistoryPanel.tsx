import { useMemo, useState } from 'react'
import ListingDetailModal from '../marketplace/ListingDetailModal'
import ReviewFormModal from './ReviewFormModal'
import SellingHistoryRow from './SellingHistoryRow'
import { useAuth } from '../../context/authContext'
import useMyListings from '../../hooks/useMyListings'
import useMySales from '../../hooks/useMySales'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import { MY_LISTING_FILTERS } from '../../services/listings'
import type { MyListingFilter } from '../../services/listings'
import { pillTabClasses } from '../../utils/pillTab'
import { getDisplayName } from '../../utils/userProfile'
import type { ListingWithImages, TransactionRow } from '../../types/domain'

interface HistoryFilter {
  id: MyListingFilter
  label: string
}

const HISTORY_FILTERS: readonly HistoryFilter[] = Object.freeze([
  { id: MY_LISTING_FILTERS.ALL, label: 'All' },
  { id: MY_LISTING_FILTERS.ACTIVE, label: 'Active' },
  { id: MY_LISTING_FILTERS.RESERVED, label: 'Reserved' },
  { id: MY_LISTING_FILTERS.SOLD, label: 'Sold' },
  { id: MY_LISTING_FILTERS.DELETED, label: 'Deleted' },
])

const EMPTY_MESSAGES: Record<MyListingFilter, string> = Object.freeze({
  [MY_LISTING_FILTERS.ALL]:
    'You have not listed anything yet. Post your harvest from the marketplace and it will show up here.',
  [MY_LISTING_FILTERS.ACTIVE]:
    'No active listings right now. Post one from the marketplace.',
  [MY_LISTING_FILTERS.RESERVED]:
    'No reserved listings. Reserve one for a buyer and it will show up here.',
  [MY_LISTING_FILTERS.SOLD]:
    'Nothing sold yet. Mark a listing as sold and it will show up here.',
  [MY_LISTING_FILTERS.DELETED]:
    'No removed listings. Listings you remove stay here for your records.',
})

const SKELETON_COUNT = 3

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-start gap-4 border border-hairline bg-canvas p-4"
        >
          <div className="aspect-[4/3] w-24 shrink-0 bg-surface-soft" />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="h-5 w-2/3 bg-surface-soft" />
            <div className="h-4 w-1/3 bg-surface-soft" />
            <div className="h-3 w-4/5 bg-surface-soft" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface HistoryListProps {
  userId: string
  filter: MyListingFilter
  onSelect: (listing: ListingWithImages) => void
  onRetry: () => void
  salesByListing: Map<string, TransactionRow>
  reviewed: Set<string>
  onReview: (transaction: TransactionRow) => void
}

function HistoryList({
  userId,
  filter,
  onSelect,
  onRetry,
  salesByListing,
  reviewed,
  onReview,
}: HistoryListProps) {
  const {
    listings,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
  } = useMyListings({ userId, filter })

  if (isInitialLoading) {
    return <HistorySkeleton />
  }

  if (error) {
    return (
      <div
        className="border border-error bg-surface-soft p-8 text-center"
        role="alert"
      >
        <p className="body-strong text-ink">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="border border-hairline bg-surface-soft p-8 text-center">
        <p className="body-sm text-body">{EMPTY_MESSAGES[filter]}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {listings.map((listing) => {
          const transaction = salesByListing.get(listing.id) ?? null
          return (
            <SellingHistoryRow
              key={listing.id}
              listing={listing}
              onSelect={onSelect}
              transaction={transaction}
              hasReviewed={transaction !== null && reviewed.has(transaction.id)}
              onReview={onReview}
            />
          )
        })}
      </div>
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="h-11 border border-hairline bg-canvas px-6 button-md text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
          >
            {isLoadingMore ? 'Loading more…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}

function SellingHistoryPanel() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<MyListingFilter>(MY_LISTING_FILTERS.ALL)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [reviewTarget, setReviewTarget] = useState<TransactionRow | null>(null)
  const sales = useMySales(user?.id)
  const reviewed = useMyReviewedTransactionIds(user?.id ?? null)
  const salesByListing = useMemo(() => {
    const map = new Map<string, TransactionRow>()
    for (const sale of sales.sales) {
      if (sale.listing_id) {
        map.set(sale.listing_id, sale)
      }
    }
    return map
  }, [sales.sales])

  if (!user) {
    return null
  }

  const handleChanged = () => setRefreshNonce((current) => current + 1)

  return (
    <section className="border border-hairline bg-canvas p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="heading-sm text-ink">Selling history</h2>
          <p className="body-sm mt-2 text-mute">
            Everything you have listed, sold, or removed.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter listings by status"
        >
          {HISTORY_FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={pillTabClasses(filter === option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <HistoryList
          key={`${filter}|${refreshNonce}`}
          userId={user.id}
          filter={filter}
          onSelect={(listing) => setSelectedListingId(listing.id)}
          onRetry={() => setRefreshNonce((current) => current + 1)}
          salesByListing={salesByListing}
          reviewed={reviewed}
          onReview={setReviewTarget}
        />
      </div>
      {selectedListingId && (
        <ListingDetailModal
          key={selectedListingId}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onChanged={handleChanged}
        />
      )}
      {reviewTarget && (
        <ReviewFormModal
          transaction={reviewTarget}
          viewerId={user.id}
          viewerName={getDisplayName(user)}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </section>
  )
}

export default SellingHistoryPanel
