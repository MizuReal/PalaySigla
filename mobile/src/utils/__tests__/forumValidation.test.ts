/// <reference types="jest" />
import {
  COMMENT_BODY_MAX_LENGTH,
  POST_BODY_MAX_LENGTH,
  POST_TITLE_MAX_LENGTH,
  POST_TITLE_MIN_LENGTH,
  PROFANITY_MESSAGE,
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

  it('rejects banned words in the title and body', () => {
    expect(
      validateForumPost({ ...VALID, title: 'This harvest is fucking wet' }).title
    ).toBe(PROFANITY_MESSAGE)
    expect(
      validateForumPost({ ...VALID, body: 'Tangina, the rain ruined it.' }).body
    ).toBe(PROFANITY_MESSAGE)
  })

  it('does not reject clean lookalike words', () => {
    expect(
      validateForumPost({
        ...VALID,
        title: 'How to classify and assess harvest quality',
        body: 'The grass grew tall and the pest count rose.',
      })
    ).toEqual({})
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

  it('rejects comments containing banned words', () => {
    expect(validateForumComment('gago, dry it first').body).toBe(PROFANITY_MESSAGE)
  })

  it('accepts clean comments with lookalike words', () => {
    expect(validateForumComment('Classify the grain and assess the grass.')).toEqual({})
  })
})
