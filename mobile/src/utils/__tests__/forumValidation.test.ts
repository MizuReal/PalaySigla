/// <reference types="jest" />
import {
  COMMENT_BODY_MAX_LENGTH,
  POST_BODY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  POST_TITLE_MIN_LENGTH,
  validateForumComment,
  validateForumPost,
} from '../forumValidation'

const VALID = Object.freeze({
  title: 'How do I store wet palay?',
  body: 'Dried for two days but rain arrived.',
  category: 'storage',
})

describe('validateForumPost', () => {
  it('accepts a valid post', () => {
    expect(validateForumPost(VALID)).toEqual({})
  })

  it('rejects titles outside the bounds (trimmed)', () => {
    expect(validateForumPost({ ...VALID, title: 'ab' }).title).toBeDefined()
    expect(
      validateForumPost({ ...VALID, title: 'a'.repeat(POST_TITLE_MAX_LENGTH) }).title
    ).toBeUndefined()
    expect(
      validateForumPost({ ...VALID, title: 'a'.repeat(POST_TITLE_MAX_LENGTH + 1) }).title
    ).toBe(
      `Title must be ${POST_TITLE_MIN_LENGTH}-${POST_TITLE_MAX_LENGTH} characters.`
    )
  })

  it('rejects an empty or over-long body', () => {
    expect(validateForumPost({ ...VALID, body: '   ' }).body).toBe(
      `Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`
    )
    expect(
      validateForumPost({ ...VALID, body: 'a'.repeat(POST_BODY_MAX_LENGTH + 1) }).body
    ).toBe(`Post content must be 1-${POST_BODY_MAX_LENGTH} characters.`)
  })

  it('rejects an unknown category', () => {
    expect(validateForumPost({ ...VALID, category: 'gossip' }).category).toBe(
      'Choose a category.'
    )
  })
})

describe('validateForumComment', () => {
  it('accepts a non-empty comment', () => {
    expect(validateForumComment('Salamat!')).toEqual({})
  })

  it('rejects empty and over-long comments', () => {
    expect(validateForumComment('   ').body).toBe(
      `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`
    )
    expect(validateForumComment('a'.repeat(COMMENT_BODY_MAX_LENGTH + 1)).body).toBe(
      `Comment must be 1-${COMMENT_BODY_MAX_LENGTH} characters.`
    )
  })
})
