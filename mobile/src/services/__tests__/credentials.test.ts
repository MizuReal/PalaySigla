/// <reference types="jest" />
import {
  createQueryBuilder,
  createStorageBucketMock,
  resetSupabaseMock,
} from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
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

const IMAGE = {
  uri: 'file:///cache/document.jpg',
  width: 1200,
  height: 1600,
  base64: 'ZmFrZQ==',
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

describe('getCredentialStoragePath', () => {
  it('scopes the document to the owner uid folder', () => {
    expect(getCredentialStoragePath('u1', 'doc.jpg')).toBe('u1/doc.jpg')
  })
})

describe('uploadCredentialDocument', () => {
  it('uploads the decoded image into the credentials bucket', async () => {
    const bucket = createStorageBucketMock()
    supabase.storage.from.mockReturnValue(bucket)

    const path = await uploadCredentialDocument('u1', IMAGE)

    expect(supabase.storage.from).toHaveBeenCalledWith('credentials')
    expect(path).toMatch(/^u1\/\d+-[a-z0-9]+\.jpg$/)
    expect(bucket.upload).toHaveBeenCalledWith(path, expect.any(ArrayBuffer), {
      contentType: 'image/jpeg',
    })
  })

  it('throws a friendly error when the upload fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.upload.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(uploadCredentialDocument('u1', IMAGE)).rejects.toThrow(
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
  it('signs the object through the shared cache', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.test/doc' },
      error: null,
    })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      getCredentialDocumentUrl('cache-user-mobile/doc.jpg')
    ).resolves.toBe('https://signed.test/doc')
    expect(supabase.storage.from).toHaveBeenCalledWith('credentials')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('cache-user-mobile/doc.jpg', 60)
  })

  it('throws a friendly error when signing fails', async () => {
    const bucket = createStorageBucketMock()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'boom' } })
    supabase.storage.from.mockReturnValue(bucket)

    await expect(
      getCredentialDocumentUrl('error-user-mobile/doc.jpg')
    ).rejects.toThrow('Could not load the document. Please try again.')
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
      image: IMAGE,
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
        image: IMAGE,
      })
    ).rejects.toThrow('Could not save the credential. Please try again.')

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(bucket.remove).toHaveBeenCalledWith([uploadedPath])
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
      image: IMAGE,
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
      image: IMAGE,
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
    const builders: Record<string, ReturnType<typeof createQueryBuilder>> = {
      profile_credentials: createQueryBuilder({ data: [{ id: 'c1' }], error: null }),
      profile_affiliations: createQueryBuilder({ data: [{ id: 'a1' }], error: null }),
      profile_endorsements: createQueryBuilder({ data: [{ id: 'e1' }], error: null }),
    }
    supabase.from.mockImplementation((table: string) => builders[table])

    const records = await fetchOwnVerificationRecords('u1')

    expect(records.credentials).toEqual([{ id: 'c1' }])
    expect(records.affiliations).toEqual([{ id: 'a1' }])
    expect(records.endorsements).toEqual([{ id: 'e1' }])
    for (const builder of Object.values(builders)) {
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'u1')
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

    expect(builder.delete).toHaveBeenCalledTimes(1)
    expect(builder.eq).toHaveBeenCalledWith('id', 'c1')
    expect(bucket.remove).toHaveBeenCalledWith(['u1/doc.jpg'])
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
  it('updates the profile with the number and existing document path', async () => {
    const builder = createQueryBuilder({ error: null })
    supabase.from.mockReturnValue(builder)

    const path = await saveRsbsaDetails('u1', {
      rsbsaNumber: 'RSBSA-12-345678-9012',
      documentPath: 'u1/old.jpg',
    })

    expect(builder.update).toHaveBeenCalledWith({
      rsbsa_number: 'RSBSA-12-345678-9012',
      rsbsa_document_path: 'u1/old.jpg',
    })
    expect(path).toBe('u1/old.jpg')
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
        image: IMAGE,
      })
    ).rejects.toThrow('That RSBSA number is already registered to another account.')

    const uploadedPath = bucket.upload.mock.calls[0][0] as string
    expect(bucket.remove).toHaveBeenCalledWith([uploadedPath])
  })
})
