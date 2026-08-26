import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import Container from '../components/Container.jsx'
import Footer from '../components/site/Footer.jsx'
import ListingCard from '../components/marketplace/ListingCard.jsx'
import ListingCardSkeleton from '../components/marketplace/ListingCardSkeleton.jsx'
import ListingDetailModal from '../components/marketplace/ListingDetailModal.jsx'
import MarketplaceFilters from '../components/marketplace/MarketplaceFilters.jsx'
import PostListingModal from '../components/marketplace/PostListingModal.jsx'
import PrimaryNav from '../components/site/PrimaryNav.jsx'
import useListings from '../hooks/useListings.js'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext.js'
import { LISTING_SORTS } from '../services/listings.js'

const SEARCH_DEBOUNCE_MS = 350
const SKELETON_COUNT = 6

function ListingFeed({ category, search, sort, onSelect, onRetry }) {
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
  const [category, setCategory] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(LISTING_SORTS.NEWEST)
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [selectedListingId, setSelectedListingId] = useState(null)
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
          <Container className="py-10 md:py-[64px]">
            <p className="caption-md text-primary">Marketplace</p>
            <h1 className="heading-xl mt-3 text-ink">
              Buy and sell straight from the sakahan.
            </h1>
            <p className="body-md mt-4 max-w-2xl text-body">
              Farmers and buyers list palay, rice, seeds, and machinery — with a
              photo and a pin on the map so you know exactly where it is.
            </p>
            <div className="mt-6">
              <Button onClick={handlePostClick}>Post a listing</Button>
            </div>
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
        <Container className="py-10 md:py-[64px]">
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
