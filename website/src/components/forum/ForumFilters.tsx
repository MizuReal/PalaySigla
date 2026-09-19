import Container from '../Container'
import { FORUM_CATEGORIES } from '../../services/forum'
import { FORUM_CATEGORY_LABELS } from '../../utils/forumCategories'
import { pillTabClasses } from '../../utils/pillTab'
import type { ForumCategory, ForumCategoryCounts } from '../../services/forum'

const SEARCH_INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

function getTotalCount(counts: ForumCategoryCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

function CategoryCount({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden="true" className="ml-1.5 opacity-70">
        {count}
      </span>
      <span className="sr-only">
        {' '}
        {count} discussion{count === 1 ? '' : 's'}
      </span>
    </>
  )
}

interface ForumFiltersProps {
  category: ForumCategory | null
  counts: ForumCategoryCounts | null
  search: string
  onCategoryChange: (category: ForumCategory | null) => void
  onSearchChange: (search: string) => void
}

function ForumFilters({
  category,
  counts,
  search,
  onCategoryChange,
  onSearchChange,
}: ForumFiltersProps) {
  return (
    <div className="border-b border-hairline bg-surface-soft">
      <Container className="flex flex-col gap-4 py-6">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter by category"
        >
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={pillTabClasses(category === null)}
          >
            All
            {counts && <CategoryCount count={getTotalCount(counts)} />}
          </button>
          {FORUM_CATEGORIES.map((categoryKey) => (
            <button
              key={categoryKey}
              type="button"
              onClick={() => onCategoryChange(categoryKey)}
              className={pillTabClasses(category === categoryKey)}
            >
              {FORUM_CATEGORY_LABELS[categoryKey]}
              {counts && <CategoryCount count={counts[categoryKey]} />}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="forum-search" className="sr-only">
            Search discussions
          </label>
          <input
            id="forum-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search discussions…"
            className={SEARCH_INPUT_CLASSES}
          />
        </div>
      </Container>
    </div>
  )
}

export default ForumFilters
