import { isForumCategory } from '../services/forum'
import type { ForumCategory } from '../services/forum'
import { containsBannedWords } from './badwords'

export const POST_TITLE_MIN_LENGTH = 3
export const POST_TITLE_MAX_LENGTH = 120
export const POST_BODY_MAX_LENGTH = 5000
export const COMMENT_BODY_MAX_LENGTH = 2000
export const PROFANITY_MESSAGE = 'Please remove inappropriate language.'

const ERROR_MESSAGES = Object.freeze({
  title: `Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`,
  body: `Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`,
  comment: `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`,
  category: 'Choose a category.',
  profanity: PROFANITY_MESSAGE,
})

export interface ForumPostInput {
  title: string
  body: string
  category: ForumCategory
}

export interface ForumPostErrors {
  title?: string
  body?: string
  category?: string
}

export interface ForumCommentErrors {
  body?: string
}

export function validateForumPost({
  title,
  body,
  category,
}: ForumPostInput): ForumPostErrors {
  const errors: ForumPostErrors = {}
  const normalizedTitle = title.trim()
  if (
    normalizedTitle.length < POST_TITLE_MIN_LENGTH ||
    normalizedTitle.length > POST_TITLE_MAX_LENGTH
  ) {
    errors.title = ERROR_MESSAGES.title
  } else if (containsBannedWords(normalizedTitle)) {
    errors.title = ERROR_MESSAGES.profanity
  }
  const normalizedBody = body.trim()
  if (normalizedBody.length === 0 || normalizedBody.length > POST_BODY_MAX_LENGTH) {
    errors.body = ERROR_MESSAGES.body
  } else if (containsBannedWords(normalizedBody)) {
    errors.body = ERROR_MESSAGES.profanity
  }
  if (!isForumCategory(category)) {
    errors.category = ERROR_MESSAGES.category
  }
  return errors
}

export function validateForumComment(body: string): ForumCommentErrors {
  const errors: ForumCommentErrors = {}
  const normalizedBody = body.trim()
  if (normalizedBody.length === 0 || normalizedBody.length > COMMENT_BODY_MAX_LENGTH) {
    errors.body = ERROR_MESSAGES.comment
  } else if (containsBannedWords(normalizedBody)) {
    errors.body = ERROR_MESSAGES.profanity
  }
  return errors
}
