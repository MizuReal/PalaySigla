import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MarketplaceFilters from '../MarketplaceFilters'
import { LISTING_SORTS } from '../../../services/listings'
import type { ListingSort } from '../../../services/listings'

interface RenderOptions {
  category?: Parameters<typeof MarketplaceFilters>[0]['category']
  search?: string
  sort?: ListingSort
}

function renderFilters({
  category = null,
  search = '',
  sort = LISTING_SORTS.NEWEST,
}: RenderOptions = {}) {
  const onCategoryChange = vi.fn()
  const onSearchChange = vi.fn()
  const onSortChange = vi.fn()
  render(
    <MarketplaceFilters
      category={category}
      search={search}
      sort={sort}
      onCategoryChange={onCategoryChange}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  )
  return { onCategoryChange, onSearchChange, onSortChange }
}

describe('MarketplaceFilters', () => {
  it('offers every category through the dropdown', () => {
    renderFilters()

    const trigger = screen.getByRole('button', { name: 'Filter by category' })
    expect(trigger.textContent).toContain('All categories')

    fireEvent.click(trigger)
    expect(screen.getByRole('option', { name: /Palay/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Rice/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Seeds/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Machinery/ })).toBeTruthy()
    expect(screen.getByRole('option', { name: /Other/ })).toBeTruthy()
  })

  it('shows the selected category and reports a new selection', () => {
    const { onCategoryChange } = renderFilters({ category: 'rice' })

    expect(screen.getByRole('button', { name: 'Filter by category' }).textContent).toContain(
      'Rice'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Filter by category' }))
    fireEvent.click(screen.getByRole('option', { name: /Machinery/ }))
    expect(onCategoryChange).toHaveBeenCalledWith('machinery')
  })

  it('reports search input changes and clears the query', () => {
    const { onSearchChange } = renderFilters({ search: 'palay' })

    fireEvent.change(screen.getByPlaceholderText('Search title or location…'), {
      target: { value: 'rice' },
    })
    expect(onSearchChange).toHaveBeenCalledWith('rice')

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('hides the clear affordance when the search is empty', () => {
    renderFilters()
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull()
  })

  it('reports sort changes', () => {
    const { onSortChange } = renderFilters()

    fireEvent.change(screen.getByLabelText('Sort listings'), {
      target: { value: LISTING_SORTS.PRICE_ASC },
    })
    expect(onSortChange).toHaveBeenCalledWith(LISTING_SORTS.PRICE_ASC)
  })
})
