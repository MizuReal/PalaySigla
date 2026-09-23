// Forum category vocabulary — the ids live here (rather than in the service as
// on the web) so the domain layer and validation can narrow the CHECK-constrained
// column without importing the Supabase service. Labels and descriptions are the
// web's utils/forumCategories.ts.
export const FORUM_CATEGORIES = Object.freeze([
  'general',
  'planting',
  'pests',
  'harvesting',
  'storage',
  'quality',
  'market',
] as const)

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]

export function isForumCategory(value: string): value is ForumCategory {
  return (FORUM_CATEGORIES as readonly string[]).includes(value)
}

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = Object.freeze({
  general: 'General',
  planting: 'Planting & Growing',
  pests: 'Pests & Diseases',
  harvesting: 'Harvesting',
  storage: 'Drying & Storage',
  quality: 'Quality & Grading',
  market: 'Market & Prices',
})
