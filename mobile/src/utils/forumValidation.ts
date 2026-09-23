// Forum input validation — a direct port of website/src/utils/forumValidation.ts
// (same constants, bounds, and messages).
import { isForumCategory } from './forumCategories'

export const POST_TITLE_MIN_LENGTH = 3
export const POST_TITLE_MAX_LENGTH = 120
export const POST_BODY_MAX_LENGTH = 5000
export const COMMENT_BODY_MAX_LENGTH = 2000

export interface ForumPostInput {
  title: string
  body: string
  category: string
}

export interface ForumPostErrors {
  title?: string
  body?: string
  category?: string
}

export interface ForumCommentErrors {
  body?: string
}

export function validateForumPost(input: ForumPostInput): ForumPostErrors {
  const errors: ForumPostErrors = {}
  const title = input.title.trim()
  if (
    title.length < POST_TITLE_MIN_LENGTH ||
    title.length > POST_TITLE_MAX_LENGTH
  ) {
    errors.title = `Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`
  }
  const body = input.body.trim()
  if (body.length < 1 || body.length > POST_BODY_MAX_LENGTH) {
    errors.body = `Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`
  }
  if (!isForumCategory(input.category)) {
    errors.category = 'Choose a category.'
  }
  return errors
}

export function validateForumComment(body: string): ForumCommentErrors {
  const trimmed = body.trim()
  if (trimmed.length < 1 || trimmed.length > COMMENT_BODY_MAX_LENGTH) {
    return { body: `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.` }
  }
  return {}
}
