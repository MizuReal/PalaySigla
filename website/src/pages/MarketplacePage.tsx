import { useEffect, useState } from 'react'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import Icon from '../components/Icon'
import ListingCard from '../components/marketplace/ListingCard'
import ListingCardSkeleton from '../components/marketplace/ListingCardSkeleton'
import ListingDetailModal from '../components/marketplace/ListingDetailModal'
import MarketplaceFilters from '../components/marketplace/MarketplaceFilters'
import PostListingModal from '../components/marketplace/PostListingModal'
import PrimaryNav from '../components/site/PrimaryNav'
import useListings from '../hooks/useListings'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { LISTING_SORTS } from '../services/listings'
import { MARKETPLACE_TAGLINE } from '../utils/listingIcons'
import type { ListingCategory, ListingSort } from '../services/listings'
import type { ListingWithImages } from '../types/domain'

const SEARCH_DEBOUNCE_MS = 350
const SKELETON_COUNT = 8

interface ListingFeedProps {
  category: ListingCategory | null
  search: string
  sort: ListingSort
  onSelect: (listing: ListingWithImages) => void
  onRetry: () => void
}

function ListingFeed({ category, search, sort, onSelect, onRetry }: ListingFeedProps) {
  const {
    listings,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
  } = useListings({ category, search, sort })

  if (isInitialLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ListingCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
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
      <div className="border border-hairline bg-surface-soft p-10 text-center">
        <p className="heading-sm text-ink">No listings yet.</p>
        <p className="body-sm mt-2 text-mute">
          Nothing matches those filters right now. Try widening the search — or
          be the first to post your harvest.
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="caption-sm text-mute">
        {total} listing{total === 1 ? '' : 's'}
      </p>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} onSelect={onSelect} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 text-center">
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

function MarketplacePage() {
  const { user, openAuthModal } = useAuth()
  const [category, setCategory] = useState<ListingCategory | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ListingSort>(LISTING_SORTS.NEWEST)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)

  // debounce keystrokes so the feed only refetches after typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  // remounting the feed on filter change gives it fresh loading state and page 1
  const feedKey = `${category ?? 'all'}|${search}|${sort}|${refreshNonce}`

  const handlePostClick = () => {
    if (user) {
      setIsPostModalOpen(true)
      return
    }
    openAuthModal(AUTH_MODAL_MODES.LOGIN)
  }

  return (
    <>
      <PrimaryNav />
      <main>
        <div className="border-b border-hairline bg-canvas">
          <Container className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="caption-md text-primary">Marketplace</p>
              <h1 className="heading-md mt-1 text-ink">
                Buy and sell from the sakahan.
              </h1>
              <p className="caption-sm mt-1 text-mute">{MARKETPLACE_TAGLINE}</p>
            </div>
            <Button onClick={handlePostClick} className="shrink-0">
              <Icon name="plus" className="h-4 w-4" />
              Post a listing
            </Button>
          </Container>
        </div>
        <MarketplaceFilters
          category={category}
          search={searchInput}
          sort={sort}
          onCategoryChange={setCategory}
          onSearchChange={setSearchInput}
          onSortChange={setSort}
        />
        <Container className="py-6 md:py-8">
          <ListingFeed
            key={feedKey}
            category={category}
            search={search}
            sort={sort}
            onSelect={(listing) => setSelectedListingId(listing.id)}
            onRetry={() => setRefreshNonce((current) => current + 1)}
          />
        </Container>
      </main>
      <Footer />
      {selectedListingId && (
        <ListingDetailModal
          key={selectedListingId}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onChanged={() => setRefreshNonce((current) => current + 1)}
        />
      )}
      {isPostModalOpen && (
        <PostListingModal
          onClose={() => setIsPostModalOpen(false)}
          onPosted={() => {
            setIsPostModalOpen(false)
            setRefreshNonce((current) => current + 1)
          }}
        />
      )}
    </>
  )
}

export default MarketplacePage
