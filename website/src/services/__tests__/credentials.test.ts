import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock'
import type { SupabaseMock } from '../../test/supabaseMock'

vi.mock('../supabaseClient', async () => {
  const { createSupabaseMock } = await import('../../test/supabaseMock')
  return { supabase: createSupabaseMock() }
})

import { supabase as supabaseClient } from '../supabaseClient'
import {
  createAffiliation,
  createCredential,
  createEndorsement,
  deleteCredential,
  fetchOwnVerificationRecords,
  getCredentialDocumentUrl,
  getCredentialStoragePath,
  removeCredentialDocument,
  saveRsbsaDetails,
  uploadCredentialDocument,
} from '../credentials'

const supabase = supabaseClient as unknown as SupabaseMock

const EMPTY_FILE = {} as Blob

beforeEach(() => {
  resetSupabaseMock(supabase)
})

describe('getCredentialStoragePath', () => {
  it('scopes the document to the owner uid folder', () => {
    expect(getCredentialStoragePath('u1', 'doc.jpg')).toBe('u1/doc.jpg')
  })
})

describe('uploadCredentialDocument', () => {
  it('uploads into the credentials bucket with a unique user-scoped name', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    const path = await uploadCredentialDocument('u1', EMPTY_FILE)

    expect(supabase.storage.from).toHaveBeenCalledWith('credentials')
    expect(path).toMatch(/^u1\/[0-9a-f-]{36}\.jpg$/)
    expect(bucket.upload).toHaveBeenCalledWith(path, EMPTY_FILE, {
      contentType: 'image/jpeg',
    })
  })

  it('throws a friendly error when the upload fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadCredentialDocument('u1', EMPTY_FILE)).rejects.toThrow(
      'Could not upload the document. Please try again.'
    )
  })
})

describe('removeCredentialDocument', () => {
  it('removes the stored object', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await removeCredentialDocument('u1/doc.jpg')

    expect(bucket.remove).toHaveBeenCalledWith(['u1/doc.jpg'])
  })

  it('throws a friendly error when the removal fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(removeCredentialDocument('u1/doc.jpg')).rejects.toThrow(
      'Could not remove the uploaded document. Please try again.'
    )
  })
})

describe('getCredentialDocumentUrl', () => {
  it('signs the object and caches the URL', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/doc' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getCredentialDocumentUrl('cache-user/doc.jpg')).resolves.toBe(
      'https://signed.test/doc'
    )
    await expect(getCredentialDocumentUrl('cache-user/doc.jpg')).resolves.toBe(
      'https://signed.test/doc'
    )

    expect(supabase.storage.from).toHaveBeenCalledWith('credentials')
    expect(bucket.createSignedUrl).toHaveBeenCalledTimes(1)
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('cache-user/doc.jpg', 60)
  })

  it('throws a friendly error when signing fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(getCredentialDocumentUrl('error-user/doc.jpg')).rejects.toThrow(
      'Could not load the document. Please try again.'
    )
  })
})

describe('createCredential', () => {
  it('uploads the document then inserts the record', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await createCredential('u1', {
      credentialType: 'philgap',
      issuingOrganization: 'PhilGAP',
      certificateNumber: 'CERT-1',
      file: EMPTY_FILE,
    })

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(supabase.from).toHaveBeenCalledWith('profile_credentials')
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      credential_type: 'philgap',
      issuing_organization: 'PhilGAP',
      certificate_number: 'CERT-1',
      document_path: uploadedPath,
    })
  })

  it('cleans up the uploaded file when the insert fails', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(
      createCredential('u1', {
        credentialType: 'other',
        issuingOrganization: 'Coop',
        certificateNumber: null,
        file: EMPTY_FILE,
      })
    ).rejects.toThrow('Could not save the credential. Please try again.')

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(bucket.remove).toHaveBeenCalledWith([uploadedPath])
  })

  it('reports when even the cleanup fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'gone' } })
    supabase.storage.from.mockReturnValue(bucket)
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(
      createCredential('u1', {
        credentialType: 'other',
        issuingOrganization: 'Coop',
        certificateNumber: null,
        file: EMPTY_FILE,
      })
    ).rejects.toThrow(
      'Could not save the credential. Please try again. The uploaded file could not be removed; please try again.'
    )
  })
})

describe('createAffiliation', () => {
  it('uploads the proof then inserts the affiliation', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await createAffiliation('u1', {
      organizationName: 'San Isidro Coop',
      membershipId: null,
      file: EMPTY_FILE,
    })

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      organization_name: 'San Isidro Coop',
      membership_id: null,
      proof_path: expect.stringMatching(/^u1\/.+\.jpg$/),
    })
  })
})

describe('createEndorsement', () => {
  it('uploads the document then inserts the typed endorsement', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    await createEndorsement('u1', {
      endorsementType: 'barangay_certification',
      municipality: 'Munoz',
      issuingOffice: 'Barangay Agriculture Office',
      dateIssued: '2026-01-15',
      file: EMPTY_FILE,
    })

    expect(builder.insert).toHaveBeenCalledWith({
      user_id: 'u1',
      endorsement_type: 'barangay_certification',
      municipality: 'Munoz',
      issuing_office: 'Barangay Agriculture Office',
      date_issued: '2026-01-15',
      document_path: expect.stringMatching(/^u1\/.+\.jpg$/),
    })
  })
})

describe('fetchOwnVerificationRecords', () => {
  it('loads credentials, affiliations, and endorsements scoped to the owner', async () => {
    const credentials = [{ id: 'c1' }]
    const affiliations = [{ id: 'a1' }]
    const endorsements = [{ id: 'e1' }]
    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {
      profile_credentials: createQueryBuilder({ data: credentials, error: null }),
      profile_affiliations: createQueryBuilder({ data: affiliations, error: null }),
      profile_endorsements: createQueryBuilder({ data: endorsements, error: null }),
    }
    supabase.from.mockImplementation((table: string) => builders[table])

    const records = await fetchOwnVerificationRecords('u1')

    expect(records).toEqual({ credentials, affiliations, endorsements })
    for (const builder of Object.values(builders)) {
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    }
  })

  it('throws a friendly error when any read fails', async () => {
    supabase.from.mockImplementation(() =>
      createQueryBuilder({ data: null, error: { message: 'boom' } })
    )

    await expect(fetchOwnVerificationRecords('u1')).rejects.toThrow(
      'Could not load your verification records. Please try again.'
    )
  })
})

describe('deleteCredential', () => {
  it('deletes the row then removes the stored document', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await deleteCredential({ id: 'c1', documentPath: 'u1/doc.jpg' })

    expect(supabase.from).toHaveBeenCalledWith('profile_credentials')
    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
    expect(bucket.remove).toHaveBeenCalledWith(['u1/doc.jpg'])
  })

  it('surfaces a row-delete failure', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: { message: 'boom' } }))

    await expect(
      deleteCredential({ id: 'c1', documentPath: 'u1/doc.jpg' })
    ).rejects.toThrow('Could not remove the credential. Please try again.')
  })

  it('tells the user when only the file cleanup failed', async () => {
    supabase.from.mockReturnValue(createQueryBuilder({ error: null }))
    const bucket = createStorageBucketMock()
    bucket.remove.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      deleteCredential({ id: 'c1', documentPath: 'u1/doc.jpg' })
    ).rejects.toThrow(
      'The credential was removed, but its uploaded file could not be deleted. Please try again.'
    )
  })
})

describe('saveRsbsaDetails', () => {
  it('updates the profile with the number and existing stub path', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    const path = await saveRsbsaDetails('u1', {
      rsbsaNumber: 'RSBSA-12-345678-9012',
      documentPath: 'u1/old.jpg',
    })

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(builder.update).toHaveBeenCalledWith({
      rsbsa_number: 'RSBSA-12-345678-9012',
      rsbsa_document_path: 'u1/old.jpg',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1')
    expect(path).toBe('u1/old.jpg')
  })

  it('uploads a replacement stub and removes the previous object', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    const path = await saveRsbsaDetails('u1', {
      rsbsaNumber: null,
      documentPath: 'u1/old.jpg',
      file: EMPTY_FILE,
    })

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(path).toBe(uploadedPath)
    expect(builder.update).toHaveBeenCalledWith({
      rsbsa_number: null,
      rsbsa_document_path: uploadedPath,
    })
    expect(bucket.remove).toHaveBeenCalledWith(['u1/old.jpg'])
  })

  it('maps a duplicate RSBSA number to a friendly error and cleans the upload', async () => {
    supabase.from.mockReturnValue(
      createQueryBuilder({ error: { message: 'duplicate', code: '23505' } })
    )
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      saveRsbsaDetails('u1', {
        rsbsaNumber: 'RSBSA-12-345678-9012',
        documentPath: null,
        file: EMPTY_FILE,
      })
    ).rejects.toThrow('That RSBSA number is already registered to another account.')

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(bucket.remove).toHaveBeenCalledWith([uploadedPath])
  })
})
