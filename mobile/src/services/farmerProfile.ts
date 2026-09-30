// Public farmer profile reads — the mobile port of
// website/src/services/farmerProfile.ts. The wall is served by security
// definer RPCs so the owner-only profiles RLS stays closed and sensitive
// identifiers (phone, typed RSBSA number, membership IDs) are never exposed.
import { supabase } from './supabaseClient'
import {
  toCredentialType,
  toEndorsementType,
  toVerificationStatus,
} from '../utils/verification'
import type { CredentialType, EndorsementType, VerificationStatus } from '../utils/verification'

export interface PublicFarmerProfile {
  id: string
  fullName: string
  avatarPath: string
  barangay: string
  municipality: string
  province: string
  farmSizeHectares: number | null
  yearsFarmingExperience: number | null
  riceVarieties: string[]
  rsbsaDocumentPath: string
  verificationStatus: VerificationStatus
  memberSince: string
  ratingAvg: number
  ratingCount: number
}

export interface PublicCredential {
  id: string
  credentialType: CredentialType
  issuingOrganization: string
  certificateNumber: string | null
  documentPath: string
  createdAt: string
}

export interface PublicAffiliation {
  id: string
  organizationName: string
  proofPath: string
  createdAt: string
}

export interface PublicEndorsement {
  id: string
  endorsementType: EndorsementType
  municipality: string
  issuingOffice: string
  dateIssued: string
  documentPath: string
  createdAt: string
}

export async function fetchFarmerProfile(
  userId: string
): Promise<PublicFarmerProfile | null> {
  const { data, error } = await supabase.rpc('farmer_profile', { p_user: userId })
  if (error) {
    throw new Error('Could not load this farmer profile. Please try again.')
  }
  const row = data?.[0]
  if (!row) {
    return null
  }
  return {
    id: row.id,
    fullName: row.full_name || '',
    avatarPath: row.avatar_path || '',
    barangay: row.barangay || '',
    municipality: row.municipality || '',
    province: row.province || '',
    farmSizeHectares: row.farm_size_hectares ?? null,
    yearsFarmingExperience: row.years_farming_experience ?? null,
    riceVarieties: row.rice_varieties ?? [],
    rsbsaDocumentPath: row.rsbsa_document_path || '',
    verificationStatus: toVerificationStatus(row.verification_status),
    memberSince: row.created_at,
    ratingAvg: Number(row.rating_avg ?? 0),
    ratingCount: Number(row.rating_count ?? 0),
  }
}

export async function fetchFarmerCredentials(
  userId: string
): Promise<PublicCredential[]> {
  const { data, error } = await supabase.rpc('farmer_credentials', { p_user: userId })
  if (error) {
    throw new Error('Could not load this farmer\u2019s credentials.')
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    credentialType: toCredentialType(row.credential_type),
    issuingOrganization: row.issuing_organization || '',
    certificateNumber: row.certificate_number ?? null,
    documentPath: row.document_path || '',
    createdAt: row.created_at,
  }))
}

export async function fetchFarmerAffiliations(
  userId: string
): Promise<PublicAffiliation[]> {
  const { data, error } = await supabase.rpc('farmer_affiliations', { p_user: userId })
  if (error) {
    throw new Error('Could not load this farmer\u2019s affiliations.')
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    organizationName: row.organization_name || '',
    proofPath: row.proof_path || '',
    createdAt: row.created_at,
  }))
}

export async function fetchFarmerEndorsements(
  userId: string
): Promise<PublicEndorsement[]> {
  const { data, error } = await supabase.rpc('farmer_endorsements', { p_user: userId })
  if (error) {
    throw new Error('Could not load this farmer\u2019s endorsements.')
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    endorsementType: toEndorsementType(row.endorsement_type),
    municipality: row.municipality || '',
    issuingOffice: row.issuing_office || '',
    dateIssued: row.date_issued,
    documentPath: row.document_path || '',
    createdAt: row.created_at,
  }))
}
