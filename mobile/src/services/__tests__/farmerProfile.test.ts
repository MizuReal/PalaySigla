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
  rsbsa_number: 'RSBSA-12-345678-9012',
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
      rsbsaNumber: 'RSBSA-12-345678-9012',
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
  it('maps credential metadata with a typed credential type', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          credential_type: 'philrice_training',
          issuing_organization: 'PhilRice',
          certificate_number: 'CERT-1',
          created_at: '2026-02-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerCredentials('u1')).resolves.toEqual([
      {
        credentialType: 'philrice_training',
        issuingOrganization: 'PhilRice',
        certificateNumber: 'CERT-1',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ])
  })

  it('throws a friendly error when the RPC fails', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchFarmerCredentials('u1')).rejects.toThrow(
      'Could not load this farmer\u2019s credentials.'
    )
  })
})

describe('fetchFarmerAffiliations', () => {
  it('maps affiliation rows', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          organization_name: 'San Isidro Farmers Coop',
          membership_id: 'M-100',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerAffiliations('u1')).resolves.toEqual([
      {
        organizationName: 'San Isidro Farmers Coop',
        membershipId: 'M-100',
        createdAt: '2026-03-01T00:00:00Z',
      },
    ])
  })
})

describe('fetchFarmerEndorsements', () => {
  it('maps endorsement rows', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          municipality: 'Munoz',
          issuing_office: 'Municipal Agriculture Office',
          date_issued: '2026-01-15',
          created_at: '2026-03-01T00:00:00Z',
        },
      ],
      error: null,
    })

    await expect(fetchFarmerEndorsements('u1')).resolves.toEqual([
      {
        municipality: 'Munoz',
        issuingOffice: 'Municipal Agriculture Office',
        dateIssued: '2026-01-15',
        createdAt: '2026-03-01T00:00:00Z',
      },
    ])
  })
})
