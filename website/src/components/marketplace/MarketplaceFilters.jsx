import Container from '../Container.jsx'
import { LISTING_CATEGORIES, LISTING_SORTS } from '../../services/listings.js'
import { CATEGORY_LABELS } from '../../utils/format.js'

const SEARCH_INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

function pillClasses(isActive) {
  return `rounded-sm border px-4 py-2.5 button-sm transition-colors ${
    isActive
      ? 'border-ink bg-ink text-on-dark'
      : 'border-hairline bg-canvas text-ink hover:border-primary hover:text-primary'
  }`
}

function MarketplaceFilters({
  category,
  search,
  sort,
  onCategoryChange,
  onSearchChange,
  onSortChange,
}) {
  return (
    <div className="border-b border-hairline bg-surface-soft">
      <Container className="flex flex-col gap-4 py-6">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={pillClasses(category === null)}
          >
            All
          </button>
          {LISTING_CATEGORIES.map((categoryKey) => (
            <button
              key={categoryKey}
              type="button"
              onClick={() => onCategoryChange(categoryKey)}
              className={pillClasses(category === categoryKey)}
            >
              {CATEGORY_LABELS[categoryKey]}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="marketplace-search" className="sr-only">
            Search listings
          </label>
          <input
            id="marketplace-search"
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by title or location…"
            className={`flex-1 ${SEARCH_INPUT_CLASSES}`}
          />
          <label htmlFor="marketplace-sort" className="sr-only">
            Sort listings
          </label>
          <select
            id="marketplace-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink sm:w-56"
          >
            <option value={LISTING_SORTS.NEWEST}>Newest first</option>
            <option value={LISTING_SORTS.PRICE_ASC}>Price: low to high</option>
            <option value={LISTING_SORTS.PRICE_DESC}>Price: high to low</option>
          </select>
        </div>
      </Container>
    </div>
  )
}

export default MarketplaceFilters
