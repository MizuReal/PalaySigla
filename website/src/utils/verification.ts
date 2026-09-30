export const VERIFICATION_STATUSES = Object.freeze({
  UNVERIFIED: 'unverified',
  PENDING: 'pending',
  VERIFIED: 'verified',
} as const)

export type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[keyof typeof VERIFICATION_STATUSES]

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  [VERIFICATION_STATUSES.UNVERIFIED]: 'Unverified',
  [VERIFICATION_STATUSES.PENDING]: 'Pending Verification',
  [VERIFICATION_STATUSES.VERIFIED]: 'Verified Rice Farmer',
}

export const CREDENTIAL_TYPES = Object.freeze({
  BPI_SEED_GROWER: 'bpi_seed_grower',
  PHILGAP: 'philgap',
  SRP_VERIFICATION: 'srp_verification',
  RMN_SEAL: 'rmn_seal',
  OTHER: 'other',
} as const)

export type CredentialType =
  (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES]

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  [CREDENTIAL_TYPES.BPI_SEED_GROWER]: 'BPI Accredited Seed Grower Certificate',
  [CREDENTIAL_TYPES.PHILGAP]: 'PhilGAP Certification',
  [CREDENTIAL_TYPES.SRP_VERIFICATION]:
    'Sustainable Rice Platform (SRP) Verification',
  [CREDENTIAL_TYPES.RMN_SEAL]:
    'Rice Farmers\u2019 National Network (RMN) Seal',
  [CREDENTIAL_TYPES.OTHER]: 'Other Agriculture-Related Certification',
}

// The RMN seal carries no issuing-org input; the network name is fixed.
export const RMN_ORGANIZATION_NAME = 'Rice Farmers\u2019 National Network'

export const ENDORSEMENT_TYPES = Object.freeze({
  BARANGAY_CERTIFICATION: 'barangay_certification',
  COOP_RECOGNITION: 'coop_recognition',
} as const)

export type EndorsementType =
  (typeof ENDORSEMENT_TYPES)[keyof typeof ENDORSEMENT_TYPES]

export const ENDORSEMENT_TYPE_LABELS: Record<EndorsementType, string> = {
  [ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION]: 'Barangay Agricultural Certification',
  [ENDORSEMENT_TYPES.COOP_RECOGNITION]:
    'Cooperative Recognition or Officer Certificate',
}

export function toVerificationStatus(value: string | null | undefined): VerificationStatus {
  const match = Object.values(VERIFICATION_STATUSES).find((status) => status === value)
  return match ?? VERIFICATION_STATUSES.UNVERIFIED
}

export function toCredentialType(value: string | null | undefined): CredentialType {
  const match = Object.values(CREDENTIAL_TYPES).find((type) => type === value)
  return match ?? CREDENTIAL_TYPES.OTHER
}

export function toEndorsementType(value: string | null | undefined): EndorsementType {
  const match = Object.values(ENDORSEMENT_TYPES).find((type) => type === value)
  return match ?? ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION
}
