import Container from '../Container'
import Icon from '../Icon'
import SelectMenu from '../SelectMenu'
import { LISTING_CATEGORIES, LISTING_SORTS } from '../../services/listings'
import type { ListingCategory, ListingSort } from '../../services/listings'
import { CATEGORY_LABELS } from '../../utils/format'
import { CATEGORY_ICONS, CATEGORY_TAG_CLASSES } from '../../utils/listingIcons'
import type { SelectMenuOption } from '../SelectMenu'

const ALL_CATEGORY_ID = 'all'

interface MarketplaceFiltersProps {
  category: ListingCategory | null
  search: string
  sort: ListingSort
  onCategoryChange: (category: ListingCategory | null) => void
  onSearchChange: (search: string) => void
  onSortChange: (sort: ListingSort) => void
}

function MarketplaceFilters({
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}: MarketplaceFiltersProps) {
  const categoryOptions: SelectMenuOption[] = [
    { id: ALL_CATEGORY_ID, label: 'All categories' },
    ...LISTING_CATEGORIES.map((categoryKey) => ({
      id: categoryKey,
      label: CATEGORY_LABELS[categoryKey],
      icon: CATEGORY_ICONS[categoryKey],
      accentText: CATEGORY_TAG_CLASSES[categoryKey].accentText,
    })),
  ]

  return (
    <div className="sticky top-16 z-40 border-b border-hairline bg-surface-soft">
      <Container className="flex flex-wrap items-center gap-2 py-3">
        <div className="flex w-full min-w-0 items-center rounded-sm border border-hairline bg-canvas focus-within:border-2 focus-within:border-primary sm:w-auto sm:flex-1">
          <Icon
            name="search"
            className="pointer-events-none ml-3 h-4 w-4 shrink-0 text-mute"
          />
          <label htmlFor="marketplace-search" className="sr-only">
            Search listings
          </label>
          <input
            id="marketplace-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search title or location…"
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
            onCategoryChange(id === ALL_CATEGORY_ID ? null : (id as ListingCategory))
          }
          className="min-w-0 flex-1 sm:w-56 sm:flex-none"
        />

        <label htmlFor="marketplace-sort" className="sr-only">
          Sort listings
        </label>
        <select
          id="marketplace-sort"
          value={sort}
          onChange={(event) =>
            // the options below are exactly the ListingSort values
            onSortChange(event.target.value as ListingSort)
          }
          className="h-11 w-36 shrink-0 border border-hairline bg-canvas px-3 body-md text-ink sm:w-44"
        >
          <option value={LISTING_SORTS.NEWEST}>Newest first</option>
          <option value={LISTING_SORTS.PRICE_ASC}>Price: low to high</option>
          <option value={LISTING_SORTS.PRICE_DESC}>Price: high to low</option>
        </select>
      </Container>
    </div>
  )
}

export default MarketplaceFilters
