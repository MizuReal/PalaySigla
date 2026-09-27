import Container from '../Container'
import Icon from '../Icon'
import SelectMenu from '../SelectMenu'
import { FORUM_CATEGORIES } from '../../services/forum'
import {
  FORUM_CATEGORY_DESCRIPTIONS,
  FORUM_CATEGORY_LABELS,
} from '../../utils/forumCategories'
import { FORUM_CATEGORY_ICONS, FORUM_CATEGORY_TAG_CLASSES } from '../../utils/forumIcons'
import type { SelectMenuOption } from '../SelectMenu'
import type { ForumCategory, ForumCategoryCounts } from '../../services/forum'

const ALL_CATEGORY_ID = 'all'
const ALL_CATEGORY_DESCRIPTION =
  'Browse every topic, or pick one to narrow the feed.'

interface ForumFiltersProps {
  category: ForumCategory | null
  counts: ForumCategoryCounts | null
  countsError: string
  search: string
  onCategoryChange: (category: ForumCategory | null) => void
  onSearchChange: (search: string) => void
  onRetryCounts: () => void
}

function ForumFilters({
  category,
  counts,
  countsError,
  search,
  onCategoryChange,
  onSearchChange,
  onRetryCounts,
}: ForumFiltersProps) {
  const categoryOptions: SelectMenuOption[] = [
    { id: ALL_CATEGORY_ID, label: 'All categories' },
    ...FORUM_CATEGORIES.map((categoryKey) => ({
      id: categoryKey,
      label: FORUM_CATEGORY_LABELS[categoryKey],
      icon: FORUM_CATEGORY_ICONS[categoryKey],
      accentText: FORUM_CATEGORY_TAG_CLASSES[categoryKey].accentText,
      count: counts ? counts[categoryKey] : undefined,
    })),
  ]

  const description = category
    ? FORUM_CATEGORY_DESCRIPTIONS[category]
    : ALL_CATEGORY_DESCRIPTION

  return (
    <div className="sticky top-16 z-40 border-b border-hairline bg-surface-soft">
      <Container className="py-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex w-full min-w-0 items-center rounded-sm border border-hairline bg-canvas focus-within:border-2 focus-within:border-primary sm:w-auto sm:flex-1">
            <Icon
              name="search"
              className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-mute"
            />
            <label htmlFor="forum-search" className="sr-only">
              Search discussions
            </label>
            <input
              id="forum-search"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search discussions…"
              className="h-11 w-full min-w-0 bg-transparent px-2 body-md text-ink placeholder:text-stone focus:outline-none focus-visible:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center text-mute transition-colors hover:text-primary"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            )}
          </div>

          <SelectMenu
            ariaLabel="Filter by category"
            value={category ?? ALL_CATEGORY_ID}
            options={categoryOptions}
            onChange={(id) =>
              onCategoryChange(id === ALL_CATEGORY_ID ? null : (id as ForumCategory))
            }
            className="w-full sm:w-64 sm:flex-none"
          />
        </div>

        {countsError ? (
          <div className="mt-2 flex flex-wrap items-center gap-3" role="alert">
            <p className="caption-sm text-error">{countsError}</p>
            <button
              type="button"
              onClick={onRetryCounts}
              className="caption-sm text-link-blue transition-colors hover:text-primary"
            >
              Retry
            </button>
          </div>
        ) : (
          <p className="mt-2 caption-sm text-mute">{description}</p>
        )}
      </Container>
    </div>
  )
}

export default ForumFilters
