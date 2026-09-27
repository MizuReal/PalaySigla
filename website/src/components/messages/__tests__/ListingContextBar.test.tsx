import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ListingContextBar from '../ListingContextBar'
import type { ListingWithImages } from '../../../types/domain'

const LISTING = {
  id: 'L1',
  title: 'Palay harvest',
  price: 50,
  unit: 'kg',
  category: 'palay',
  listing_images: [],
} as unknown as ListingWithImages

describe('ListingContextBar', () => {
  it('shows the product, price, and category without the old eyebrow', () => {
    render(
      <ListingContextBar
        title="Palay harvest"
        listing={LISTING}
        imageUrl=""
        isLoading={false}
        isUnavailable={false}
      />
    )

    expect(screen.getByText('Palay harvest')).toBeTruthy()
    expect(screen.getByText('Palay')).toBeTruthy()
    expect(screen.getByText(/50/)).toBeTruthy()
    expect(screen.queryByText('User inquired about this product')).toBeNull()
  })

  it('opens the listing when it is available and onOpen is provided', () => {
    const onOpen = vi.fn()
    render(
      <ListingContextBar
        title="Palay harvest"
        listing={LISTING}
        imageUrl=""
        isLoading={false}
        isUnavailable={false}
        onOpen={onOpen}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open listing: Palay harvest' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('shows only the title while the listing loads', () => {
    render(
      <ListingContextBar
        title="Palay harvest"
        listing={null}
        imageUrl=""
        isLoading
        isUnavailable={false}
      />
    )

    expect(screen.getByText('Palay harvest')).toBeTruthy()
    expect(screen.queryByText('This listing is no longer available.')).toBeNull()
    expect(screen.queryByText('Palay')).toBeNull()
  })

  it('degrades gracefully and stays non-interactive when the listing is gone', () => {
    const onOpen = vi.fn()
    render(
      <ListingContextBar
        title="Palay harvest"
        listing={null}
        imageUrl=""
        isLoading={false}
        isUnavailable
        onOpen={onOpen}
      />
    )

    expect(screen.getByText('This listing is no longer available.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
