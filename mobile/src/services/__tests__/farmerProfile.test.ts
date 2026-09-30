/// <reference types="jest" />
import { resetSupabaseMock } from '../../test/supabaseMock'

jest.mock('../supabaseClient', () => {
  const { createSupabaseMock } = jest.requireActual<typeof import('../../test/supabaseMock')>(
    '../../test/supabaseMock'
  )
  return { supabase: createSupabaseMock() }
})

import type { SupabaseMock } from '../../test/supabaseMock'
import { supabase as supabaseClient } from '../supabaseClient'
import {
  fetchFarmerAffiliations,
  fetchFarmerCredentials,
  fetchFarmerEndorsements,
  fetchFarmerProfile,
} from '../farmerProfile'

const supabase = supabaseClient as unknown as SupabaseMock

const PROFILE_ROW = {
  id: 'u1',
  full_name: 'Juan dela Cruz',
  avatar_path: 'u1/avatar.jpg',
  barangay: 'San Isidro',
  municipality: 'Munoz',
  province: 'Nueva Ecija',
  farm_size_hectares: 2.5,
  years_farming_experience: 12,
  rice_varieties: ['NSIC Rc222', 'Dinorado'],
  rsbsa_document_path: 'u1/rsbsa.jpg',
  verification_status: 'verified',
  created_at: '2026-01-01T00:00:00Z',
  rating_avg: 4.5,
  rating_count: 3,
}

beforeEach(() => {
  resetSupabaseMock(supabase)
})

describe('fetchFarmerProfile', () => {
  it('maps the RPC row into a public profile', async () => {
    supabase.rpc.mockResolvedValue({ data: [PROFILE_ROW], error: null })

    const profile = await fetchFarmerProfile('u1')

    expect(supabase.rpc).toHaveBeenCalledWith('farmer_profile', { p_user: 'u1' })
    expect(profile).toEqual({
      id: 'u1',
      fullName: 'Juan dela Cruz',
      avatarPath: 'u1/avatar.jpg',
      barangay: 'San Isidro',
      municipality: 'Munoz',
      province: 'Nueva Ecija',
      farmSizeHectares: 2.5,
      yearsFarmingExperience: 12,
      riceVarieties: ['NSIC Rc222', 'Dinorado'],
      rsbsaDocumentPath: 'u1/rsbsa.jpg',
      verificationStatus: 'verified',
      memberSince: '2026-01-01T00:00:00Z',
      ratingAvg: 4.5,
      ratingCount: 3,
    })
  })

  it('returns null when the farmer does not exist', async () => {
    supabase.rpc.mockResolvedValue({ data: [], error: null })

    await expect(fetchFarmerProfile('missing')).resolves.toBeNull()
  })

  it('throws a friendly error when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchFarmerProfile('u1')).rejects.toThrow(
      'Could not load this farmer profile. Please try again.'
    )
  })
})

describe('fetchFarmerCredentials', () => {
  it('maps credential metadata with the certificate path', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'c1',
          credential_type: 'philgap',
          issuing_organization: 'PhilGAP',
          certificate_number: 'CERT-1',
          document_path: 'u1/cert.jpg',
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerCredentials('u1')).resolves.toEqual([
      {
        id: 'c1',
        credentialType: 'philgap',
        issuingOrganization: 'PhilGAP',
        certificateNumber: 'CERT-1',
        documentPath: 'u1/cert.jpg',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ])
  })

  it('falls back to "other" for unknown credential types', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'c1',
          credential_type: 'mystery',
          issuing_organization: null,
          certificate_number: null,
          document_path: null,
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    })

    const credentials = await fetchFarmerCredentials('u1')
    expect(credentials[0].credentialType).toBe('other')
    expect(credentials[0].documentPath).toBe('')
  })

  it('throws a friendly error when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchFarmerCredentials('u1')).rejects.toThrow(
      'Could not load this farmer\u2019s credentials.'
    )
  })
})

describe('fetchFarmerAffiliations', () => {
  it('maps affiliation rows without membership IDs', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'a1',
          organization_name: 'San Isidro Farmers Coop',
          proof_path: 'u1/proof.jpg',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerAffiliations('u1')).resolves.toEqual([
      {
        id: 'a1',
        organizationName: 'San Isidro Farmers Coop',
        proofPath: 'u1/proof.jpg',
        createdAt: '2026-03-01T00:00:00Z',
      },
    ])
  })
})

describe('fetchFarmerEndorsements', () => {
  it('maps typed endorsement rows', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          id: 'e1',
          endorsement_type: 'coop_recognition',
          municipality: 'Munoz',
          issuing_office: 'San Isidro Coop',
          date_issued: '2026-01-15',
          document_path: 'u1/endorsement.jpg',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerEndorsements('u1')).resolves.toEqual([
      {
        id: 'e1',
        endorsementType: 'coop_recognition',
        municipality: 'Munoz',
        issuingOffice: 'San Isidro Coop',
        dateIssued: '2026-01-15',
        documentPath: 'u1/endorsement.jpg',
        createdAt: '2026-03-01T00:00:00Z',
      },
    ])
  })
})
