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
  PHILRICE_TRAINING: 'philrice_training',
  BPI_SEED_GROWER: 'bpi_seed_grower',
  OTHER: 'other',
} as const)

export type CredentialType =
  (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES]

export const CREDENTIAL_TYPE_LABELS: Record<CredentialType, string> = {
  [CREDENTIAL_TYPES.PHILRICE_TRAINING]: 'PhilRice training certificate',
  [CREDENTIAL_TYPES.BPI_SEED_GROWER]: 'BPI seed grower certificate',
  [CREDENTIAL_TYPES.OTHER]: 'Other rice farming certification',
}

export function toVerificationStatus(value: string | null | undefined): VerificationStatus {
  const match = Object.values(VERIFICATION_STATUSES).find((status) => status === value)
  return match ?? VERIFICATION_STATUSES.UNVERIFIED
}

export function toCredentialType(value: string | null | undefined): CredentialType {
  const match = Object.values(CREDENTIAL_TYPES).find((type) => type === value)
  return match ?? CREDENTIAL_TYPES.OTHER
}
