import { useState } from 'react'
import ListingDetailModal from '../marketplace/ListingDetailModal.jsx'
import SellingHistoryRow from './SellingHistoryRow.jsx'
import { useAuth } from '../../context/authContext.js'
import useMyListings from '../../hooks/useMyListings.js'
import { MY_LISTING_FILTERS } from '../../services/listings.js'
import { pillTabClasses } from '../../utils/pillTab.js'

const HISTORY_FILTERS = Object.freeze([
  { id: MY_LISTING_FILTERS.ALL, label: 'All' },
  { id: MY_LISTING_FILTERS.ACTIVE, label: 'Active' },
  { id: MY_LISTING_FILTERS.SOLD, label: 'Sold' },
  { id: MY_LISTING_FILTERS.DELETED, label: 'Deleted' },
])

const EMPTY_MESSAGES = Object.freeze({
  [MY_LISTING_FILTERS.ALL]:
    'You have not listed anything yet. Post your harvest from the marketplace and it will show up here.',
  [MY_LISTING_FILTERS.ACTIVE]:
    'No active listings right now. Post one from the marketplace.',
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

function HistoryList({ userId, filter, onSelect, onRetry }) {
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
        {listings.map((listing) => (
          <SellingHistoryRow
            key={listing.id}
            listing={listing}
            onSelect={onSelect}
          />
        ))}
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
  const [filter, setFilter] = useState(MY_LISTING_FILTERS.ALL)
  const [selectedListingId, setSelectedListingId] = useState(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

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
    </section>
  )
}

export default SellingHistoryPanel
