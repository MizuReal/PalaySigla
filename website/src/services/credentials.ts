import { supabase } from './supabaseClient'
import type {
  ProfileAffiliationRow,
  ProfileCredentialRow,
  ProfileDocumentRow,
  ProfileEndorsementRow,
} from '../types/domain'
import type { CredentialType } from '../utils/verification'

export const CREDENTIAL_BUCKET = 'credentials'
export const MAX_CREDENTIAL_DIMENSION = 1600

const DOCUMENT_CONTENT_TYPE = 'image/jpeg'
const RSBSA_DUPLICATE_CODE = '23505'

export interface OwnVerificationRecords {
  credentials: ProfileCredentialRow[]
  affiliations: ProfileAffiliationRow[]
  endorsements: ProfileEndorsementRow[]
  documents: ProfileDocumentRow[]
}

export interface VerificationRecordRef {
  id: string
  documentPath: string
}

export interface NewCredentialInput {
  credentialType: CredentialType
  issuingOrganization: string
  certificateNumber: string | null
  file: Blob | File
}

export interface NewAffiliationInput {
  organizationName: string
  membershipId: string | null
  file: Blob | File
}

export interface NewEndorsementInput {
  municipality: string
  issuingOffice: string
  dateIssued: string
  file: Blob | File
}

export interface NewSupportingDocumentInput {
  label: string
  file: Blob | File
}

export interface SaveRsbsaInput {
  rsbsaNumber: string | null
  documentPath: string | null
  file?: Blob | File
}

export function getCredentialStoragePath(userId: string, fileName: string): string {
  return `${userId}/${fileName}`
}

function createDocumentFileName(): string {
  return `${crypto.randomUUID()}.jpg`
}

export async function uploadCredentialDocument(
  userId: string,
  file: Blob | File
): Promise<string> {
  const storagePath = getCredentialStoragePath(userId, createDocumentFileName())
  const { error } = await supabase.storage.from(CREDENTIAL_BUCKET).upload(storagePath, file, {
    contentType: DOCUMENT_CONTENT_TYPE,
  })
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
  const [credentials, affiliations, endorsements, documents] = await Promise.all([
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
    supabase
      .from('profile_documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ])
  const failed =
    credentials.error ?? affiliations.error ?? endorsements.error ?? documents.error
  if (failed) {
    throw new Error('Could not load your verification records. Please try again.')
  }
  return {
    credentials: credentials.data ?? [],
    affiliations: affiliations.data ?? [],
    endorsements: endorsements.data ?? [],
    documents: documents.data ?? [],
  }
}

export async function createCredential(
  userId: string,
  { credentialType, issuingOrganization, certificateNumber, file }: NewCredentialInput
): Promise<void> {
  const documentPath = await uploadCredentialDocument(userId, file)
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
  { organizationName, membershipId, file }: NewAffiliationInput
): Promise<void> {
  const proofPath = await uploadCredentialDocument(userId, file)
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
  { municipality, issuingOffice, dateIssued, file }: NewEndorsementInput
): Promise<void> {
  const documentPath = await uploadCredentialDocument(userId, file)
  const { error } = await supabase.from('profile_endorsements').insert({
    user_id: userId,
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

export async function createSupportingDocument(
  userId: string,
  { label, file }: NewSupportingDocumentInput
): Promise<void> {
  const documentPath = await uploadCredentialDocument(userId, file)
  const { error } = await supabase.from('profile_documents').insert({
    user_id: userId,
    label,
    document_path: documentPath,
  })
  if (error) {
    const cleaned = await cleanupUploadedDocument(documentPath)
    throw recordFailure('Could not save the document. Please try again.', cleaned)
  }
}

export async function deleteSupportingDocument(record: VerificationRecordRef): Promise<void> {
  const { error } = await supabase.from('profile_documents').delete().eq('id', record.id)
  if (error) {
    throw new Error('Could not remove the document. Please try again.')
  }
  try {
    await removeCredentialDocument(record.documentPath)
  } catch {
    throw new Error(
      'The document was removed, but its uploaded file could not be deleted. Please try again.'
    )
  }
}

// RSBSA lives on the profiles row; when a replacement document is uploaded the
// old object is cleaned up after the row already points at the new file, so a
// cleanup failure never leaves the profile pointing at a deleted document.
export async function saveRsbsaDetails(
  userId: string,
  { rsbsaNumber, documentPath, file }: SaveRsbsaInput
): Promise<string> {
  let nextDocumentPath = documentPath
  if (file) {
    nextDocumentPath = await uploadCredentialDocument(userId, file)
  }
  const { error } = await supabase
    .from('profiles')
    .update({
      rsbsa_number: rsbsaNumber,
      rsbsa_document_path: nextDocumentPath,
    })
    .eq('id', userId)
  if (error) {
    if (file) {
      await cleanupUploadedDocument(nextDocumentPath ?? '')
    }
    if (error.code === RSBSA_DUPLICATE_CODE) {
      throw new Error('That RSBSA number is already registered to another account.')
    }
    throw new Error('Could not save your RSBSA details. Please try again.')
  }
  if (file && documentPath && documentPath !== nextDocumentPath) {
    try {
      await removeCredentialDocument(documentPath)
    } catch {
      // the profile already references the replacement; a stale object is
      // harmless and re-uploading replaces the row pointer again
    }
  }
  return nextDocumentPath ?? ''
}
