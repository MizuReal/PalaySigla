/// <reference types="jest" />
import { getDisplayName, getInitials } from '../userProfile'

describe('getDisplayName', () => {
  it('prefers the metadata full name, then email, then Account', () => {
    expect(getDisplayName({ user_metadata: { full_name: 'Juan Cruz' }, email: 'j@x.ph' })).toBe(
      'Juan Cruz'
    )
    expect(getDisplayName({ user_metadata: null, email: 'j@x.ph' })).toBe('j@x.ph')
    expect(getDisplayName(null)).toBe('Account')
    expect(getDisplayName(undefined)).toBe('Account')
  })
})

describe('getInitials', () => {
  it('uses the first and last word initials', () => {
    expect(getInitials('Juan dela Cruz')).toBe('JC')
    expect(getInitials('Maria Santos')).toBe('MS')
  })

  it('handles a single word', () => {
    expect(getInitials('Romy')).toBe('R')
  })

  it('falls back to a bullet when the name yields nothing', () => {
    expect(getInitials('   ')).toBe('\u2022')
    expect(getInitials('')).toBe('\u2022')
  })
})
