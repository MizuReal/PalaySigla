export const POST_TITLE_MIN_LENGTH = 3
export const POST_TITLE_MAX_LENGTH = 120
export const POST_BODY_MAX_LENGTH = 5000
export const COMMENT_BODY_MAX_LENGTH = 2000

const ERROR_MESSAGES = Object.freeze({
  title: `Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`,
  body: `Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`,
  comment: `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`,
})

export interface ForumPostInput {
  title: string
  body: string
}

export interface ForumPostErrors {
  title?: string
  body?: string
}

export interface ForumCommentErrors {
  body?: string
}

export function validateForumPost({ title, body }: ForumPostInput): ForumPostErrors {
  const errors: ForumPostErrors = {}
  const normalizedTitle = title.trim()
  if (
    normalizedTitle.length < POST_TITLE_MIN_LENGTH ||
    normalizedTitle.length > POST_TITLE_MAX_LENGTH
  ) {
    errors.title = ERROR_MESSAGES.title
  }
  const normalizedBody = body.trim()
  if (normalizedBody.length === 0 || normalizedBody.length > POST_BODY_MAX_LENGTH) {
    errors.body = ERROR_MESSAGES.body
  }
  return errors
}

export function validateForumComment(body: string): ForumCommentErrors {
  const errors: ForumCommentErrors = {}
  const normalizedBody = body.trim()
  if (normalizedBody.length === 0 || normalizedBody.length > COMMENT_BODY_MAX_LENGTH) {
    errors.body = ERROR_MESSAGES.comment
  }
  return errors
}
