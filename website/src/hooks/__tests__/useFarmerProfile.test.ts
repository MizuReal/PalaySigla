import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../services/farmerProfile', () => ({
  fetchFarmerProfile: vi.fn(),
  fetchFarmerCredentials: vi.fn(),
  fetchFarmerAffiliations: vi.fn(),
  fetchFarmerEndorsements: vi.fn(),
}))

vi.mock('../../services/profile', () => ({
  getAvatarUrl: vi.fn(),
}))

import {
  fetchFarmerAffiliations,
  fetchFarmerCredentials,
  fetchFarmerEndorsements,
  fetchFarmerProfile,
} from '../../services/farmerProfile'
import { getAvatarUrl } from '../../services/profile'
import type { PublicFarmerProfile } from '../../services/farmerProfile'
import useFarmerProfile from '../useFarmerProfile'

const fetchFarmerProfileMock = vi.mocked(fetchFarmerProfile)
const fetchFarmerCredentialsMock = vi.mocked(fetchFarmerCredentials)
const fetchFarmerAffiliationsMock = vi.mocked(fetchFarmerAffiliations)
const fetchFarmerEndorsementsMock = vi.mocked(fetchFarmerEndorsements)
const getAvatarUrlMock = vi.mocked(getAvatarUrl)

const VERIFIED_PROFILE: PublicFarmerProfile = {
  id: 'u1',
  fullName: 'Juan dela Cruz',
  avatarPath: 'u1/avatar.jpg',
  barangay: 'San Isidro',
  municipality: 'Munoz',
  province: 'Nueva Ecija',
  farmSizeHectares: 2.5,
  yearsFarmingExperience: 12,
  riceVarieties: ['Dinorado'],
  rsbsaNumber: 'RSBSA-12-345678-9012',
  verificationStatus: 'verified',
  memberSince: '2026-01-01T00:00:00Z',
  ratingAvg: 4.5,
  ratingCount: 3,
}

beforeEach(() => {
  vi.resetAllMocks()
  getAvatarUrlMock.mockResolvedValue('https://signed.test/avatar')
  fetchFarmerCredentialsMock.mockResolvedValue([])
  fetchFarmerAffiliationsMock.mockResolvedValue([])
  fetchFarmerEndorsementsMock.mockResolvedValue([])
})

describe('useFarmerProfile', () => {
  it('loads a verified profile with its avatar and verification records', async () => {
    fetchFarmerProfileMock.mockResolvedValue(VERIFIED_PROFILE)
    fetchFarmerCredentialsMock.mockResolvedValue([
      {
        credentialType: 'philrice_training',
        issuingOrganization: 'PhilRice',
        certificateNumber: 'CERT-1',
        createdAt: '2026-02-01T00:00:00Z',
      },
    ])

    const { result } = renderHook(() => useFarmerProfile('u1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchFarmerProfile).toHaveBeenCalledWith('u1')
    expect(getAvatarUrl).toHaveBeenCalledWith('u1/avatar.jpg')
    expect(result.current.profile).toEqual(VERIFIED_PROFILE)
    expect(result.current.avatarUrl).toBe('https://signed.test/avatar')
    expect(result.current.credentials).toHaveLength(1)
    expect(result.current.detailsError).toBe('')
  })

  it('skips the verification RPCs for an unverified profile', async () => {
    fetchFarmerProfileMock.mockResolvedValue({
      ...VERIFIED_PROFILE,
      verificationStatus: 'pending',
      avatarPath: '',
    })

    const { result } = renderHook(() => useFarmerProfile('u1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(fetchFarmerCredentials).not.toHaveBeenCalled()
    expect(fetchFarmerAffiliations).not.toHaveBeenCalled()
    expect(fetchFarmerEndorsements).not.toHaveBeenCalled()
    expect(getAvatarUrl).not.toHaveBeenCalled()
    expect(result.current.credentials).toEqual([])
  })

  it('returns a null profile when the farmer does not exist', async () => {
    fetchFarmerProfileMock.mockResolvedValue(null)

    const { result } = renderHook(() => useFarmerProfile('missing'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.profile).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('surfaces a profile load failure', async () => {
    fetchFarmerProfileMock.mockRejectedValue(
      new Error('Could not load this farmer profile. Please try again.')
    )

    const { result } = renderHook(() => useFarmerProfile('u1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe(
      'Could not load this farmer profile. Please try again.'
    )
    expect(result.current.profile).toBeNull()
  })

  it('keeps the wall usable when only the verification records fail', async () => {
    fetchFarmerProfileMock.mockResolvedValue(VERIFIED_PROFILE)
    fetchFarmerCredentialsMock.mockRejectedValue(
      new Error('Could not load this farmer\u2019s credentials.')
    )

    const { result } = renderHook(() => useFarmerProfile('u1'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.profile).toEqual(VERIFIED_PROFILE)
    expect(result.current.detailsError).toBe(
      'Could not load this farmer\u2019s credentials.'
    )
    expect(result.current.error).toBe('')
  })
})
