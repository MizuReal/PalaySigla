import { describe, expect, it } from 'vitest'
import {
  COMMENT_BODY_MAX_LENGTH,
  POST_BODY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  POST_TITLE_MIN_LENGTH,
  validateForumComment,
  validateForumPost,
} from '../forumValidation'
import type { ForumCategory } from '../../services/forum'

const VALID_POST = Object.freeze({
  title: 'When should I dry palay after harvest?',
  body: 'My harvest came in wet this week and I am unsure how long to dry it.',
  category: 'storage' as const,
})

describe('validateForumPost', () => {
  it('accepts a valid post with no errors', () => {
    expect(validateForumPost(VALID_POST)).toEqual({})
  })

  it('rejects titles outside the length bounds', () => {
    expect(validateForumPost({ ...VALID_POST, title: 'ab' }).title).toBe(
      `Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`
    )
    expect(
      validateForumPost({ ...VALID_POST, title: 'a'.repeat(POST_TITLE_MAX_LENGTH + 1) }).title
    ).toBe(`Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`)
  })

  it('trims the title before checking its length', () => {
    expect(validateForumPost({ ...VALID_POST, title: '  ab  ' }).title).toBeDefined()
    expect(validateForumPost({ ...VALID_POST, title: '  abc  ' }).title).toBeUndefined()
  })

  it('rejects blank and oversized bodies', () => {
    expect(validateForumPost({ ...VALID_POST, body: '   ' }).body).toBe(
      `Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`
    )
    expect(
      validateForumPost({ ...VALID_POST, body: 'a'.repeat(POST_BODY_MAX_LENGTH + 1) }).body
    ).toBe(`Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`)
    expect(
      validateForumPost({ ...VALID_POST, body: 'a'.repeat(POST_BODY_MAX_LENGTH) }).body
    ).toBeUndefined()
  })

  it('rejects categories outside the known set', () => {
    expect(validateForumPost(VALID_POST).category).toBeUndefined()
    expect(
      validateForumPost({
        ...VALID_POST,
        category: 'unknown' as ForumCategory,
      }).category
    ).toBe('Choose a category.')
  })
})

describe('validateForumComment', () => {
  it('accepts a valid comment with no errors', () => {
    expect(validateForumComment('Dry it to 14% moisture before storage.')).toEqual({})
  })

  it('rejects blank and oversized comments', () => {
    expect(validateForumComment('   ').body).toBe(
      `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`
    )
    expect(validateForumComment('a'.repeat(COMMENT_BODY_MAX_LENGTH + 1)).body).toBe(
      `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`
    )
    expect(validateForumComment('a'.repeat(COMMENT_BODY_MAX_LENGTH)).body).toBeUndefined()
  })
})
