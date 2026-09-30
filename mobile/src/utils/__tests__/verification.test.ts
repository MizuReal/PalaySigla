/// <reference types="jest" />
import {
  CREDENTIAL_TYPES,
  ENDORSEMENT_TYPES,
  VERIFICATION_STATUSES,
  toCredentialType,
  toEndorsementType,
  toVerificationStatus,
} from '../verification'

describe('toVerificationStatus', () => {
  it('passes known statuses through', () => {
    expect(toVerificationStatus('verified')).toBe(VERIFICATION_STATUSES.VERIFIED)
    expect(toVerificationStatus('pending')).toBe(VERIFICATION_STATUSES.PENDING)
  })

  it('falls back to unverified for unknown or missing values', () => {
    expect(toVerificationStatus('mystery')).toBe(VERIFICATION_STATUSES.UNVERIFIED)
    expect(toVerificationStatus(null)).toBe(VERIFICATION_STATUSES.UNVERIFIED)
  })
})

describe('toCredentialType', () => {
  it('passes known types through', () => {
    expect(toCredentialType('philgap')).toBe(CREDENTIAL_TYPES.PHILGAP)
    expect(toCredentialType('rmn_seal')).toBe(CREDENTIAL_TYPES.RMN_SEAL)
  })

  it('falls back to other for unknown values', () => {
    expect(toCredentialType('mystery')).toBe(CREDENTIAL_TYPES.OTHER)
  })
})

describe('toEndorsementType', () => {
  it('passes known types through', () => {
    expect(toEndorsementType('coop_recognition')).toBe(
      ENDORSEMENT_TYPES.COOP_RECOGNITION
    )
  })

  it('falls back to the barangay type for unknown values', () => {
    expect(toEndorsementType('mystery')).toBe(
      ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION
    )
  })
})
