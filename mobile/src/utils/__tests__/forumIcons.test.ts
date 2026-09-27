/// <reference types="jest" />
import { FORUM_CATEGORIES } from '../forumCategories'
import { FORUM_CATEGORY_ICONS, FORUM_CATEGORY_TAG_COLORS } from '../forumIcons'

describe('forumIcons', () => {
  it('maps every forum category to a glyph', () => {
    for (const category of FORUM_CATEGORIES) {
      expect(FORUM_CATEGORY_ICONS[category]?.length).toBeGreaterThan(0)
    }
  })

  it('gives every category a distinct fill and accent tag', () => {
    const fills = new Set<string>()
    for (const category of FORUM_CATEGORIES) {
      const tag = FORUM_CATEGORY_TAG_COLORS[category]
      expect(tag).toBeDefined()
      expect(tag.fill.length).toBeGreaterThan(0)
      expect(tag.accent.length).toBeGreaterThan(0)
      fills.add(tag.fill)
    }
    expect(fills.size).toBe(FORUM_CATEGORIES.length)
  })
})
