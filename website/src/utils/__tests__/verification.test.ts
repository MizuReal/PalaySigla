import { describe, expect, it } from 'vitest'
import {
  CREDENTIAL_TYPES,
  VERIFICATION_STATUSES,
  toCredentialType,
  toVerificationStatus,
} from '../verification'

describe('toVerificationStatus', () => {
  it('passes known statuses through', () => {
    expect(toVerificationStatus('verified')).toBe(VERIFICATION_STATUSES.VERIFIED)
    expect(toVerificationStatus('pending')).toBe(VERIFICATION_STATUSES.PENDING)
    expect(toVerificationStatus('unverified')).toBe(VERIFICATION_STATUSES.UNVERIFIED)
  })

  it('falls back to unverified for unknown or missing values', () => {
    expect(toVerificationStatus('mystery')).toBe(VERIFICATION_STATUSES.UNVERIFIED)
    expect(toVerificationStatus(null)).toBe(VERIFICATION_STATUSES.UNVERIFIED)
  })
})

describe('toCredentialType', () => {
  it('passes known types through', () => {
    expect(toCredentialType('philrice_training')).toBe(
      CREDENTIAL_TYPES.PHILRICE_TRAINING
    )
    expect(toCredentialType('bpi_seed_grower')).toBe(CREDENTIAL_TYPES.BPI_SEED_GROWER)
  })

  it('falls back to other for unknown values', () => {
    expect(toCredentialType('mystery')).toBe(CREDENTIAL_TYPES.OTHER)
    expect(toCredentialType(undefined)).toBe(CREDENTIAL_TYPES.OTHER)
  })
})
