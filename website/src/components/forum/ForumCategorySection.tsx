import { useState } from 'react'
import Container from '../Container'
import Icon from '../Icon'
import { FORUM_CATEGORIES } from '../../services/forum'
import {
  FORUM_CATEGORY_DESCRIPTIONS,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import type { ForumCategory, ForumCategoryCounts } from '../../services/forum'
import type { IconName } from '../Icon'

const GRID_ID = 'forum-category-grid'
const COUNT_PLACEHOLDER_CLASSES = 'mt-2 h-3 w-16 animate-pulse bg-surface-soft'

const CATEGORY_ICONS: Record<ForumCategory, IconName> = Object.freeze({
  general: 'chat',
  planting: 'sprout',
  pests: 'bug',
  harvesting: 'basket',
  storage: 'drop',
  quality: 'quality',
  market: 'scale',
})

function formatCount(count: number): string {
  return `${count} discussion${count === 1 ? '' : 's'}`
}

interface ForumCategorySectionProps {
  activeCategory: ForumCategory | null
  counts: ForumCategoryCounts | null
  isLoading: boolean
  error: string
  onSelect: (category: ForumCategory) => void
  onRetry: () => void
}

function ForumCategorySection({
  activeCategory,
  counts,
  isLoading,
  error,
  onSelect,
  onRetry,
}: ForumCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const summary = activeCategory
    ? `Showing ${FORUM_CATEGORY_LABELS[activeCategory]}`
    : 'Pick a topic to filter the feed.'

  const handleSelect = (category: ForumCategory) => {
    setIsExpanded(false)
    onSelect(category)
  }

  return (
    <section className="bg-canvas" aria-labelledby="forum-categories-heading">
      <Container className={isExpanded ? 'py-10 md:py-[64px]' : 'py-8 md:py-10'}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="caption-md text-primary">Browse by category</p>
            <h2 id="forum-categories-heading" className="heading-md mt-3 text-ink">
              Find the right conversation.
            </h2>
            {isExpanded ? (
              <p className="body-sm mt-2 max-w-2xl text-mute">
                Pick a topic to filter the feed, or keep browsing everything.
              </p>
            ) : (
              <p className="body-sm mt-2 text-mute">{summary}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            aria-expanded={isExpanded}
            aria-controls={GRID_ID}
            className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary text-on-primary transition-colors hover:bg-primary-dark"
          >
            <span className="sr-only">
              {isExpanded ? 'Hide categories' : 'Show categories'}
            </span>
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              className="h-5 w-5"
            />
          </button>
        </div>
        {error && (
          <div className="mt-4 flex flex-wrap items-center gap-3" role="alert">
            <p className="body-sm text-error">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Try again
            </button>
          </div>
        )}
        <div
          id={GRID_ID}
          className={`mt-6 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isExpanded ? 'grid' : 'hidden'}`}
          role="group"
          aria-label="Browse discussions by category"
        >
          {FORUM_CATEGORIES.map((category) => {
            const isActive = activeCategory === category
            return (
              <button
                key={category}
                type="button"
                onClick={() => handleSelect(category)}
                aria-pressed={isActive}
                className={`flex h-full flex-col border bg-canvas p-6 text-left transition-colors ${
                  isActive
                    ? 'border-primary'
                    : 'border-hairline hover:border-primary'
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${
                      isActive ? 'bg-primary' : 'bg-surface-soft'
                    }`}
                  >
                    <Icon
                      name={CATEGORY_ICONS[category]}
                      className={`h-5 w-5 ${isActive ? 'text-on-primary' : 'text-body'}`}
                    />
                  </span>
                  <span className={`card-title ${isActive ? 'text-primary' : 'text-ink'}`}>
                    {FORUM_CATEGORY_LABELS[category]}
                  </span>
                </span>
                {counts ? (
                  <span className="caption-sm mt-3 text-mute">
                    {formatCount(counts[category])}
                  </span>
                ) : (
                  isLoading && (
                    <span
                      aria-hidden="true"
                      className={COUNT_PLACEHOLDER_CLASSES}
                    />
                  )
                )}
                <span className="body-sm mt-3 text-body">
                  {FORUM_CATEGORY_DESCRIPTIONS[category]}
                </span>
              </button>
            )
          })}
        </div>
      </Container>
    </section>
  )
}

export default ForumCategorySection
