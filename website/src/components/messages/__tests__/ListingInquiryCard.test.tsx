import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ListingInquiryCard from '../ListingInquiryCard'
import type { ListingWithImages } from '../../../types/domain'

const LISTING = {
  id: 'L1',
  title: 'Palay harvest',
  price: 50,
  unit: 'kg',
  category: 'palay',
  listing_images: [],
} as unknown as ListingWithImages

describe('ListingInquiryCard', () => {
  it('shows the inquiry line, product, price, and category', () => {
    render(
      <ListingInquiryCard
        title="Palay harvest"
        listing={LISTING}
        imageUrl=""
        isLoading={false}
        isUnavailable={false}
      />
    )

    expect(screen.getByText('User inquired about this product')).toBeTruthy()
    expect(screen.getByText('Palay harvest')).toBeTruthy()
    expect(screen.getByText('Palay')).toBeTruthy()
    expect(screen.getByText(/50/)).toBeTruthy()
  })

  it('shows only the title while the listing loads', () => {
    render(
      <ListingInquiryCard
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

  it('degrades gracefully when the listing is gone', () => {
    render(
      <ListingInquiryCard
        title="Palay harvest"
        listing={null}
        imageUrl=""
        isLoading={false}
        isUnavailable
      />
    )

    expect(screen.getByText('Palay harvest')).toBeTruthy()
    expect(screen.getByText('This listing is no longer available.')).toBeTruthy()
  })
})
