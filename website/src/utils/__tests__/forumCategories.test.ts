import { describe, expect, it } from 'vitest'
import { FORUM_CATEGORIES } from '../../services/forum'
import {
  FORUM_CATEGORY_DESCRIPTIONS,
  FORUM_CATEGORY_LABELS,
} from '../forumCategories'

describe('forum category metadata', () => {
  it('labels every category in declaration order', () => {
    expect(Object.keys(FORUM_CATEGORY_LABELS)).toEqual([...FORUM_CATEGORIES])
    for (const category of FORUM_CATEGORIES) {
      expect(FORUM_CATEGORY_LABELS[category].length).toBeGreaterThan(0)
    }
  })

  it('describes every category in declaration order', () => {
    expect(Object.keys(FORUM_CATEGORY_DESCRIPTIONS)).toEqual([...FORUM_CATEGORIES])
    for (const category of FORUM_CATEGORIES) {
      expect(FORUM_CATEGORY_DESCRIPTIONS[category].length).toBeGreaterThan(0)
    }
  })
})
