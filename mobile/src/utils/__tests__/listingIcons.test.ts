/// <reference types="jest" />
import {
  CATEGORY_ICONS,
  CATEGORY_TAG_COLORS,
  MARKETPLACE_TAGLINE,
} from '../listingIcons'
import { LISTING_CATEGORIES } from '../../services/listings'

describe('listingIcons', () => {
  it('maps every listing category to a glyph', () => {
    for (const category of LISTING_CATEGORIES) {
      expect(CATEGORY_ICONS[category]?.length).toBeGreaterThan(0)
    }
  })

  it('gives every category a distinct fill and accent tag', () => {
    const fills = new Set<string>()
    for (const category of LISTING_CATEGORIES) {
      const tag = CATEGORY_TAG_COLORS[category]
      expect(tag).toBeDefined()
      expect(tag.fill.length).toBeGreaterThan(0)
      expect(tag.accent.length).toBeGreaterThan(0)
      fills.add(tag.fill)
    }
    expect(fills.size).toBe(LISTING_CATEGORIES.length)
  })

  it('names the four goods the marketplace sells', () => {
    expect(MARKETPLACE_TAGLINE).toBe('Palay · Rice · Seeds · Machinery')
  })
})
