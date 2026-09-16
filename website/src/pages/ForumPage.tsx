import { useEffect, useRef, useState } from 'react'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import ForumPostCard from '../components/forum/ForumPostCard'
import ForumPostCardSkeleton from '../components/forum/ForumPostCardSkeleton'
import PostEditorModal from '../components/forum/PostEditorModal'
import useForumPosts from '../hooks/useForumPosts'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'

const SEARCH_DEBOUNCE_MS = 350
const SKELETON_COUNT = 4
const SEARCH_INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

interface ForumFeedProps {
  search: string
  refreshNonce: number
}

function ForumFeed({ search, refreshNonce }: ForumFeedProps) {
  const {
    posts,
    total,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
  } = useForumPosts({ search })
  // the feed remounts on a new search, so only a nonce change after mount
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
    return (
      <div className="border border-hairline bg-surface-soft p-10 text-center">
        <p className="heading-sm text-ink">
          {search ? 'No discussions match that search.' : 'No discussions yet.'}
        </p>
        <p className="body-sm mt-2 text-mute">
          {search
            ? 'Try a different word, or clear the search to see everything.'
            : 'Be the first to ask a question or share what worked in the field.'}
        </p>
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
          <ForumPostCard key={post.id} post={post} />
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
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)
  const [isComposerOpen, setIsComposerOpen] = useState(false)

  // debounce keystrokes so the feed only refetches after typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleStartDiscussion = () => {
    if (user) {
      setIsComposerOpen(true)
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
        <div className="border-b border-hairline bg-surface-soft">
          <Container className="py-6">
            <label htmlFor="forum-search" className="sr-only">
              Search discussions
            </label>
            <input
              id="forum-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search discussions…"
              className={SEARCH_INPUT_CLASSES}
            />
          </Container>
        </div>
        <Container className="py-10 md:py-[64px]">
          <ForumFeed key={search} search={search} refreshNonce={refreshNonce} />
        </Container>
      </main>
      <Footer />
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
