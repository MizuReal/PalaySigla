// Verification-record data access — the mobile port of
// website/src/services/credentials.ts. Uploads carry the compressed image's
// base64 payload (RN-safe) instead of a web File/Blob.
import { supabase } from './supabaseClient'
import { getSignedImageUrl } from './signedUrlCache'
import { decodePreparedImage } from '../utils/image'
import type { PreparedImage } from '../utils/image'
import type {
  ProfileAffiliationRow,
  ProfileCredentialRow,
  ProfileEndorsementRow,
} from '../types/domain'
import type { CredentialType, EndorsementType } from '../utils/verification'

export const CREDENTIAL_BUCKET = 'credentials'
export const MAX_CREDENTIAL_DIMENSION = 1600

const DOCUMENT_CONTENT_TYPE = 'image/jpeg'
const RSBSA_DUPLICATE_CODE = '23505'

export interface OwnVerificationRecords {
  credentials: ProfileCredentialRow[]
  affiliations: ProfileAffiliationRow[]
  endorsements: ProfileEndorsementRow[]
}

export interface VerificationRecordRef {
  id: string
  documentPath: string
}

export interface NewCredentialInput {
  credentialType: CredentialType
  issuingOrganization: string
  certificateNumber: string | null
  image: PreparedImage
}

export interface NewAffiliationInput {
  organizationName: string
  membershipId: string | null
  image: PreparedImage
}

export interface NewEndorsementInput {
  endorsementType: EndorsementType
  municipality: string
  issuingOffice: string
  dateIssued: string
  image: PreparedImage
}

export interface SaveRsbsaInput {
  rsbsaNumber: string | null
  documentPath: string | null
  image?: PreparedImage
}

export function getCredentialStoragePath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}

function createDocumentFileName(): string {
  // timestamp + random suffix keeps paths unique without a crypto dependency
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`
}

export async function uploadCredentialDocument(
  userId: string,
  image: PreparedImage
): Promise<string> {
  const storagePath = getCredentialStoragePath(userId, createDocumentFileName())
  const bytes = decodePreparedImage(image)
  const { error } = await supabase.storage
    .from(CREDENTIAL_BUCKET)
    .upload(storagePath, bytes, { contentType: DOCUMENT_CONTENT_TYPE })
  if (error) {
    throw new Error('Could not upload the document. Please try again.')
  }
  return storagePath
}

export async function removeCredentialDocument(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(CREDENTIAL_BUCKET).remove([storagePath])
  if (error) {
    throw new Error('Could not remove the uploaded document. Please try again.')
  }
}

// Owner documents and wall certificates both sign through the shared cache;
// the storage policies decide who can actually sign which path.
export async function getCredentialDocumentUrl(storagePath: string): Promise<string> {
  return getSignedImageUrl(
    CREDENTIAL_BUCKET,
    storagePath,
    'Could not load the document. Please try again.'
  )
}

// A row insert that fails after its document upload must not leave the file
// behind. The cleanup is limited to the just-uploaded path, and a cleanup
// failure is surfaced in the error message instead of hidden.
async function cleanupUploadedDocument(storagePath: string): Promise<boolean> {
  try {
    await removeCredentialDocument(storagePath)
    return true
  } catch {
    return false
  }
}

function recordFailure(message: string, cleaned: boolean): Error {
  return new Error(
    cleaned
      ? message
      : `${message} The uploaded file could not be removed; please try again.`
  )
}

export async function fetchOwnVerificationRecords(
  userId: string
): Promise<OwnVerificationRecords> {
  const [credentials, affiliations, endorsements] = await Promise.all([
    supabase
      .from('profile_credentials')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profile_affiliations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('profile_endorsements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])
  const failed = credentials.error ?? affiliations.error ?? endorsements.error
  if (failed) {
    throw new Error('Could not load your verification records. Please try again.')
  }
  return {
    credentials: credentials.data ?? [],
    affiliations: affiliations.data ?? [],
    endorsements: endorsements.data ?? [],
  }
}

export async function createCredential(
  userId: string,
  { credentialType, issuingOrganization, certificateNumber, image }: NewCredentialInput
): Promise<void> {
  const documentPath = await uploadCredentialDocument(userId, image)
  const { error } = await supabase.from('profile_credentials').insert({
    user_id: userId,
    credential_type: credentialType,
    issuing_organization: issuingOrganization,
    certificate_number: certificateNumber,
    document_path: documentPath,
  })
  if (error) {
    const cleaned = await cleanupUploadedDocument(documentPath)
    throw recordFailure('Could not save the credential. Please try again.', cleaned)
  }
}

export async function deleteCredential(record: VerificationRecordRef): Promise<void> {
  const { error } = await supabase
    .from('profile_credentials')
    .delete()
    .eq('id', record.id)
  if (error) {
    throw new Error('Could not remove the credential. Please try again.')
  }
  try {
    await removeCredentialDocument(record.documentPath)
  } catch {
    throw new Error(
      'The credential was removed, but its uploaded file could not be deleted. Please try again.'
    )
  }
}

export async function createAffiliation(
  userId: string,
  { organizationName, membershipId, image }: NewAffiliationInput
): Promise<void> {
  const proofPath = await uploadCredentialDocument(userId, image)
  const { error } = await supabase.from('profile_affiliations').insert({
    user_id: userId,
    organization_name: organizationName,
    membership_id: membershipId,
    proof_path: proofPath,
  })
  if (error) {
    const cleaned = await cleanupUploadedDocument(proofPath)
    throw recordFailure('Could not save the affiliation. Please try again.', cleaned)
  }
}

export async function deleteAffiliation(record: VerificationRecordRef): Promise<void> {
  const { error } = await supabase.from('profile_affiliations').delete().eq('id', record.id)
  if (error) {
    throw new Error('Could not remove the affiliation. Please try again.')
  }
  try {
    await removeCredentialDocument(record.documentPath)
  } catch {
    throw new Error(
      'The affiliation was removed, but its uploaded file could not be deleted. Please try again.'
    )
  }
}

export async function createEndorsement(
  userId: string,
  { endorsementType, municipality, issuingOffice, dateIssued, image }: NewEndorsementInput
): Promise<void> {
  const documentPath = await uploadCredentialDocument(userId, image)
  const { error } = await supabase.from('profile_endorsements').insert({
    user_id: userId,
    endorsement_type: endorsementType,
    municipality,
    issuing_office: issuingOffice,
    date_issued: dateIssued,
    document_path: documentPath,
  })
  if (error) {
    const cleaned = await cleanupUploadedDocument(documentPath)
    throw recordFailure('Could not save the endorsement. Please try again.', cleaned)
  }
}

export async function deleteEndorsement(record: VerificationRecordRef): Promise<void> {
  const { error } = await supabase
    .from('profile_endorsements')
    .delete()
    .eq('id', record.id)
  if (error) {
    throw new Error('Could not remove the endorsement. Please try again.')
  }
  try {
    await removeCredentialDocument(record.documentPath)
  } catch {
    throw new Error(
      'The endorsement was removed, but its uploaded file could not be deleted. Please try again.'
    )
  }
}

// RSBSA lives on the profiles row; when a replacement stub is uploaded the old
// object is cleaned up after the row already points at the new file, so a
// cleanup failure never leaves the profile pointing at a deleted document.
export async function saveRsbsaDetails(
  userId: string,
  { rsbsaNumber, documentPath, image }: SaveRsbsaInput
): Promise<string> {
  let nextDocumentPath = documentPath
  if (image) {
    nextDocumentPath = await uploadCredentialDocument(userId, image)
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      rsbsa_number: rsbsaNumber,
      rsbsa_document_path: nextDocumentPath,
    })
    .eq('id', userId)
  if (error) {
    if (image) {
      await cleanupUploadedDocument(nextDocumentPath ?? '')
    }
    if (error.code === RSBSA_DUPLICATE_CODE) {
      throw new Error('That RSBSA number is already registered to another account.')
    }
    throw new Error('Could not save your RSBSA details. Please try again.')
  }
  if (image && documentPath && documentPath !== nextDocumentPath) {
    try {
      await removeCredentialDocument(documentPath)
    } catch {
      // the profile already references the replacement; a stale object is
      // harmless and re-uploading replaces the row pointer again
    }
  }
  return nextDocumentPath ?? ''
}
