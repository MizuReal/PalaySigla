import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/authContext'
import { fetchProfile } from '../services/profile'
import {
  createAffiliation,
  createCredential,
  createEndorsement,
  createSupportingDocument,
  deleteAffiliation,
  deleteCredential,
  deleteEndorsement,
  deleteSupportingDocument,
  fetchOwnVerificationRecords,
  saveRsbsaDetails,
} from '../services/credentials'
import type {
  NewAffiliationInput,
  NewCredentialInput,
  NewEndorsementInput,
  NewSupportingDocumentInput,
  OwnVerificationRecords,
  SaveRsbsaInput,
  VerificationRecordRef,
} from '../services/credentials'
import { toVerificationStatus, VERIFICATION_STATUSES } from '../utils/verification'
import type { VerificationStatus } from '../utils/verification'

function emptyRecords(): OwnVerificationRecords {
  return { credentials: [], affiliations: [], endorsements: [], documents: [] }
}

export interface UseVerificationRecordsResult {
  verificationStatus: VerificationStatus
  isLocked: boolean
  rsbsaNumber: string
  rsbsaDocumentPath: string
  records: OwnVerificationRecords
  isInitialLoading: boolean
  loadError: string
  retryLoad: () => void
  removingId: string
  saveRsbsa: (input: SaveRsbsaInput) => Promise<void>
  addCredential: (input: NewCredentialInput) => Promise<void>
  removeCredential: (record: VerificationRecordRef) => Promise<void>
  addAffiliation: (input: NewAffiliationInput) => Promise<void>
  removeAffiliation: (record: VerificationRecordRef) => Promise<void>
  addEndorsement: (input: NewEndorsementInput) => Promise<void>
  removeEndorsement: (record: VerificationRecordRef) => Promise<void>
  addSupportingDocument: (input: NewSupportingDocumentInput) => Promise<void>
  removeSupportingDocument: (record: VerificationRecordRef) => Promise<void>
}

// Action callbacks deliberately reject on failure: each section owns its
// inline error copy, while the hook only tracks the row currently being
// removed so the list can show a busy label.
function useVerificationRecords(): UseVerificationRecordsResult {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>(
    VERIFICATION_STATUSES.UNVERIFIED
  )
  const [rsbsaNumber, setRsbsaNumber] = useState('')
  const [rsbsaDocumentPath, setRsbsaDocumentPath] = useState('')
  const [records, setRecords] = useState<OwnVerificationRecords>(emptyRecords)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadNonce, setLoadNonce] = useState(0)
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      setIsInitialLoading(true)
      setLoadError('')
      if (!userId) {
        setIsInitialLoading(false)
        return
      }
      try {
        const [profile, nextRecords] = await Promise.all([
          fetchProfile(userId),
          fetchOwnVerificationRecords(userId),
        ])
        if (isCancelled) {
          return
        }
        setVerificationStatus(toVerificationStatus(profile?.verification_status))
        setRsbsaNumber(profile?.rsbsa_number ?? '')
        setRsbsaDocumentPath(profile?.rsbsa_document_path ?? '')
        setRecords(nextRecords)
      } catch (err) {
        if (!isCancelled) {
          setLoadError(
            err instanceof Error ? err.message : 'Could not load your verification records.'
          )
        }
      } finally {
        if (!isCancelled) {
          setIsInitialLoading(false)
        }
      }
    }

    load()
    return () => {
      isCancelled = true
    }
  }, [userId, loadNonce])

  const refresh = useCallback(async () => {
    if (!userId) {
      return
    }
    const [profile, nextRecords] = await Promise.all([
      fetchProfile(userId),
      fetchOwnVerificationRecords(userId),
    ])
    setVerificationStatus(toVerificationStatus(profile?.verification_status))
    setRsbsaNumber(profile?.rsbsa_number ?? '')
    setRsbsaDocumentPath(profile?.rsbsa_document_path ?? '')
    setRecords(nextRecords)
  }, [userId])

  const run = useCallback(
    async (action: () => Promise<unknown>): Promise<void> => {
      if (!userId) {
        return
      }
      await action()
      await refresh()
    },
    [userId, refresh]
  )

  const remove = useCallback(
    async (record: VerificationRecordRef, action: () => Promise<void>): Promise<void> => {
      setRemovingId(record.id)
      try {
        await action()
        await refresh()
      } finally {
        setRemovingId('')
      }
    },
    [refresh]
  )

  const saveRsbsa = useCallback(
    (input: SaveRsbsaInput) => run(() => saveRsbsaDetails(userId ?? '', input)),
    [run, userId]
  )

  const addCredential = useCallback(
    (input: NewCredentialInput) =>
      run(() => createCredential(userId ?? '', input)),
    [run, userId]
  )

  const removeCredential = useCallback(
    (record: VerificationRecordRef) => remove(record, () => deleteCredential(record)),
    [remove]
  )

  const addAffiliation = useCallback(
    (input: NewAffiliationInput) =>
      run(() => createAffiliation(userId ?? '', input)),
    [run, userId]
  )

  const removeAffiliation = useCallback(
    (record: VerificationRecordRef) => remove(record, () => deleteAffiliation(record)),
    [remove]
  )

  const addEndorsement = useCallback(
    (input: NewEndorsementInput) =>
      run(() => createEndorsement(userId ?? '', input)),
    [run, userId]
  )

  const removeEndorsement = useCallback(
    (record: VerificationRecordRef) => remove(record, () => deleteEndorsement(record)),
    [remove]
  )

  const addSupportingDocument = useCallback(
    (input: NewSupportingDocumentInput) =>
      run(() => createSupportingDocument(userId ?? '', input)),
    [run, userId]
  )

  const removeSupportingDocument = useCallback(
    (record: VerificationRecordRef) =>
      remove(record, () => deleteSupportingDocument(record)),
    [remove]
  )

  return {
    verificationStatus,
    isLocked: verificationStatus === VERIFICATION_STATUSES.VERIFIED,
    rsbsaNumber,
    rsbsaDocumentPath,
    records,
    isInitialLoading,
    loadError,
    retryLoad: () => setLoadNonce((current) => current + 1),
    removingId,
    saveRsbsa,
    addCredential,
    removeCredential,
    addAffiliation,
    removeAffiliation,
    addEndorsement,
    removeEndorsement,
    addSupportingDocument,
    removeSupportingDocument,
  }
}

export default useVerificationRecords
