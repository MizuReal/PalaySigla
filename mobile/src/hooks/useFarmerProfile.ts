import { useCallback, useEffect, useState } from 'react'
import {
  fetchFarmerAffiliations,
  fetchFarmerCredentials,
  fetchFarmerEndorsements,
  fetchFarmerProfile,
} from '../services/farmerProfile'
import type {
  PublicAffiliation,
  PublicCredential,
  PublicEndorsement,
  PublicFarmerProfile,
} from '../services/farmerProfile'
import { getAvatarUrl } from '../services/profile'
import { VERIFICATION_STATUSES } from '../utils/verification'

export interface UseFarmerProfileResult {
  profile: PublicFarmerProfile | null
  avatarUrl: string
  avatarError: string
  credentials: PublicCredential[]
  affiliations: PublicAffiliation[]
  endorsements: PublicEndorsement[]
  detailsError: string
  isLoading: boolean
  error: string
  retry: () => void
}

function useFarmerProfile(userId: string | null): UseFarmerProfileResult {
  const [profile, setProfile] = useState<PublicFarmerProfile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [credentials, setCredentials] = useState<PublicCredential[]>([])
  const [affiliations, setAffiliations] = useState<PublicAffiliation[]>([])
  const [endorsements, setEndorsements] = useState<PublicEndorsement[]>([])
  const [detailsError, setDetailsError] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [error, setError] = useState('')
  const [loadNonce, setLoadNonce] = useState(0)

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      setError('')
      setDetailsError('')
      setAvatarError('')
      if (!userId) {
        setProfile(null)
        setAvatarUrl('')
        setCredentials([])
        setAffiliations([])
        setEndorsements([])
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setAvatarUrl('')
      setCredentials([])
      setAffiliations([])
      setEndorsements([])
      try {
        const fetched = await fetchFarmerProfile(userId)
        if (isCancelled) {
          return
        }
        setProfile(fetched)
        if (!fetched) {
          return
        }
        if (fetched.avatarPath) {
          try {
            const url = await getAvatarUrl(fetched.avatarPath)
            if (!isCancelled) {
              setAvatarUrl(url)
            }
          } catch {
            if (!isCancelled) {
              setAvatarError('Could not load this farmer\u2019s photo.')
            }
          }
        }
        if (fetched.verificationStatus === VERIFICATION_STATUSES.VERIFIED) {
          try {
            const [nextCredentials, nextAffiliations, nextEndorsements] = await Promise.all([
              fetchFarmerCredentials(userId),
              fetchFarmerAffiliations(userId),
              fetchFarmerEndorsements(userId),
            ])
            if (!isCancelled) {
              setCredentials(nextCredentials)
              setAffiliations(nextAffiliations)
              setEndorsements(nextEndorsements)
            }
          } catch (err) {
            if (!isCancelled) {
              setDetailsError(
                err instanceof Error
                  ? err.message
                  : 'Could not load the verification records.'
              )
            }
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Could not load this farmer profile.'
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      isCancelled = true
    }
  }, [userId, loadNonce])

  const retry = useCallback(() => {
    setLoadNonce((current) => current + 1)
  }, [])

  return {
    profile,
    avatarUrl,
    avatarError,
    credentials,
    affiliations,
    endorsements,
    detailsError,
    isLoading,
    error,
    retry,
  }
}

export default useFarmerProfile
