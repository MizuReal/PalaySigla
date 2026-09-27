/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import ListingFilters from '../ListingFilters'
import { LISTING_SORTS } from '../../../services/listings'
import type { ListingCategory, ListingSort } from '../../../services/listings'

interface RenderOverrides {
  category?: ListingCategory | null
  search?: string
  sort?: ListingSort
}

async function renderFilters({
  category = null,
  search = '',
  sort = LISTING_SORTS.NEWEST,
}: RenderOverrides = {}) {
  const onCategoryChange = jest.fn()
  const onSearchChange = jest.fn()
  const onSortChange = jest.fn()
  const screen = await render(
    <ListingFilters
      category={category}
      search={search}
      sort={sort}
      onCategoryChange={onCategoryChange}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  )
  return { screen, onCategoryChange, onSearchChange, onSortChange }
}

describe('ListingFilters', () => {
  it('keeps the category dropdown behind the filter toggle', async () => {
    const { screen } = await renderFilters()

    expect(screen.queryByText('All categories')).toBeNull()
    await fireEvent.press(screen.getByLabelText('Show filters'))
    expect(screen.getByLabelText('Filter by category: All categories')).toBeTruthy()
    expect(screen.queryByText('Machinery')).toBeNull()

    await fireEvent.press(screen.getByLabelText('Filter by category: All categories'))
    expect(screen.getByText('Machinery')).toBeTruthy()
  })

  it('reports the selected category', async () => {
    const { screen, onCategoryChange } = await renderFilters()

    await fireEvent.press(screen.getByLabelText('Show filters'))
    await fireEvent.press(screen.getByLabelText('Filter by category: All categories'))
    await fireEvent.press(screen.getByText('Machinery'))
    expect(onCategoryChange).toHaveBeenCalledWith('machinery')
  })

  it('reports search changes and clears the query', async () => {
    const { screen, onSearchChange } = await renderFilters({ search: 'palay' })

    await fireEvent.changeText(
      screen.getByPlaceholderText('Search title or location…'),
      'rice'
    )
    expect(onSearchChange).toHaveBeenCalledWith('rice')

    await fireEvent.press(screen.getByLabelText('Clear search'))
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('reports sort changes from the expanded sort row', async () => {
    const { screen, onSortChange } = await renderFilters()

    await fireEvent.press(screen.getByLabelText('Show filters'))
    await fireEvent.press(screen.getByText('Highest price'))
    expect(onSortChange).toHaveBeenCalledWith(LISTING_SORTS.PRICE_DESC)
  })
})
