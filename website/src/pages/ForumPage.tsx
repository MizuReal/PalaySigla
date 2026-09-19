import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import ForumCategorySection from '../components/forum/ForumCategorySection'
import ForumFilters from '../components/forum/ForumFilters'
import ForumPostCard from '../components/forum/ForumPostCard'
import ForumPostCardSkeleton from '../components/forum/ForumPostCardSkeleton'
import ForumThreadModal from '../components/forum/ForumThreadModal'
import PostEditorModal from '../components/forum/PostEditorModal'
import useForumCategoryCounts from '../hooks/useForumCategoryCounts'
import useForumPosts from '../hooks/useForumPosts'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { isForumCategory } from '../services/forum'
import type { ForumCategory } from '../services/forum'
import { FORUM_CATEGORY_LABELS } from '../utils/forumCategories'

const SEARCH_DEBOUNCE_MS = 350
const SKELETON_COUNT = 4
const FEED_ANCHOR_ID = 'forum-feed'

interface ForumFeedProps {
  category: ForumCategory | null
  search: string
  refreshNonce: number
  onSelect: (postId: string) => void
}

function ForumFeed({ category, search, refreshNonce, onSelect }: ForumFeedProps) {
  const {
    posts,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
  } = useForumPosts({ category, search })
  // the feed remounts on a new filter, so only a nonce change after mount
  // should reload; reacting to the starting value would double-fetch
  const seenRefreshNonceRef = useRef(refreshNonce)

  // a saved discussion bumps the nonce; reloading in place keeps the list
  // steady instead of flashing skeletons
  useEffect(() => {
    if (refreshNonce !== seenRefreshNonceRef.current) {
      seenRefreshNonceRef.current = refreshNonce
      refresh()
    }
  }, [refreshNonce, refresh])

  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <ForumPostCardSkeleton key={index} />
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
          onClick={refresh}
          className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  if (posts.length === 0) {
    const categoryLabel = category ? FORUM_CATEGORY_LABELS[category] : ''
    let emptyTitle = 'No discussions yet.'
    let emptyHint = 'Be the first to ask a question or share what worked in the field.'
    if (search && category) {
      emptyTitle = `No discussions match that search in ${categoryLabel}.`
      emptyHint = 'Try a different word, or clear the search to see everything.'
    } else if (search) {
      emptyTitle = 'No discussions match that search.'
      emptyHint = 'Try a different word, or clear the search to see everything.'
    } else if (category) {
      emptyTitle = `No discussions in ${categoryLabel} yet.`
      emptyHint = 'Be the first to start a conversation here.'
    }
    return (
      <div className="border border-hairline bg-surface-soft p-10 text-center">
        <p className="heading-sm text-ink">{emptyTitle}</p>
        <p className="body-sm mt-2 text-mute">{emptyHint}</p>
      </div>
    )
  }

  return (
    <>
      <p className="caption-sm text-mute">
        {total} discussion{total === 1 ? '' : 's'}
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {posts.map((post) => (
          <ForumPostCard key={post.id} post={post} onSelect={onSelect} />
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

function ForumPage() {
  const { user, openAuthModal } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  const rawCategory = searchParams.get('category')
  const activeCategory =
    rawCategory !== null && isForumCategory(rawCategory) ? rawCategory : null

  const {
    counts,
    isLoading: isCountsLoading,
    error: countsError,
    retry: retryCounts,
  } = useForumCategoryCounts(refreshNonce)

  // debounce keystrokes so the feed only refetches after typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleCategoryChange = (category: ForumCategory | null) => {
    const nextParams = new URLSearchParams(searchParams)
    if (category) {
      nextParams.set('category', category)
    } else {
      nextParams.delete('category')
    }
    setSearchParams(nextParams)
  }

  const handleCategorySelect = (category: ForumCategory) => {
    handleCategoryChange(category)
    // choosing a card collapses the grid and hides the clicked button, so move
    // focus with the scroll to keep keyboard users in view of the feed
    const feedContainer = document.getElementById(FEED_ANCHOR_ID)
    feedContainer?.scrollIntoView()
    feedContainer?.focus()
  }

  const handleStartDiscussion = () => {
    if (user) {
      setIsComposerOpen(true)
      return
    }
    openAuthModal(AUTH_MODAL_MODES.LOGIN)
  }

  // remounting the feed on a filter change gives it fresh loading state and page 1
  const feedKey = `${search}|${activeCategory ?? 'all'}`

  return (
    <>
      <PrimaryNav />
      <main>
        <div className="border-b border-hairline bg-canvas">
          <Container className="py-10 md:py-[64px]">
            <p className="caption-md text-primary">Community</p>
            <h1 className="heading-xl mt-3 text-ink">
              Ask, share, and learn with fellow farmers.
            </h1>
            <p className="body-md mt-4 max-w-2xl text-body">
              Talk about planting, pests, drying, and market prices. Post a
              question or pass on what has worked for you.
            </p>
            <div className="mt-6">
              <Button onClick={handleStartDiscussion}>Start a discussion</Button>
            </div>
          </Container>
        </div>
        <ForumCategorySection
          activeCategory={activeCategory}
          counts={counts}
          isLoading={isCountsLoading}
          error={countsError}
          onSelect={handleCategorySelect}
          onRetry={retryCounts}
        />
        <ForumFilters
          category={activeCategory}
          counts={counts}
          search={searchInput}
          onCategoryChange={handleCategoryChange}
          onSearchChange={setSearchInput}
        />
        <Container className="py-10 md:py-[64px]">
          <div id={FEED_ANCHOR_ID} className="scroll-mt-16" tabIndex={-1}>
            <ForumFeed
              key={feedKey}
              category={activeCategory}
              search={search}
              refreshNonce={refreshNonce}
              onSelect={setSelectedPostId}
            />
          </div>
        </Container>
      </main>
      <Footer />
      {selectedPostId && (
        <ForumThreadModal
          key={selectedPostId}
          postId={selectedPostId}
          onClose={() => setSelectedPostId(null)}
          onChanged={() => setRefreshNonce((current) => current + 1)}
        />
      )}
      {isComposerOpen && (
        <PostEditorModal
          onClose={() => setIsComposerOpen(false)}
          onSaved={() => {
            setIsComposerOpen(false)
            setRefreshNonce((current) => current + 1)
          }}
        />
      )}
    </>
  )
}

export default ForumPage
