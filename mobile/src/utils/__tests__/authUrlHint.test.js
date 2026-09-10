import { AUTH_RETURN_PATH, createAuthReturnUrl, parseAuthRedirectUrl } from '../authUrlHint'

describe('createAuthReturnUrl', () => {
  it('returns the configured redirect URL', () => {
    expect(createAuthReturnUrl()).toBe('https://palaysigla.test/auth/callback')
  })

  it('exposes the callback path used by the email flow', () => {
    expect(AUTH_RETURN_PATH).toBe('auth/callback')
  })
})

describe('parseAuthRedirectUrl', () => {
  it('reads query params', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?code=abc123&type=signup')).toEqual({
      code: 'abc123',
      type: 'signup',
    })
  })

  it('reads fragment params', () => {
    expect(
      parseAuthRedirectUrl(
        'palaysigla://auth/callback#access_token=tok&refresh_token=ref&type=recovery'
      )
    ).toEqual({ access_token: 'tok', refresh_token: 'ref', type: 'recovery' })
  })

  it('merges query and fragment params with the fragment winning', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?code=abc#code=override&x=1')).toEqual({
      code: 'override',
      x: '1',
    })
  })

  it('decodes percent-encoded keys and values', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?error_description=Cancelled%20by%20user')).toEqual(
      { error_description: 'Cancelled by user' }
    )
  })

  it('skips pairs with malformed escapes, empty pairs, and empty keys', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?code=%E0%A4%A&ok=1')).toEqual({
      ok: '1',
    })
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?&a=1&&b=2')).toEqual({ a: '1', b: '2' })
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?=value&code=1')).toEqual({ code: '1' })
  })

  it('treats a key without a value as an empty string', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback?code')).toEqual({ code: '' })
  })

  it('returns no params when the URL carries neither query nor fragment', () => {
    expect(parseAuthRedirectUrl('palaysigla://auth/callback')).toEqual({})
  })
})
