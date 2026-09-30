import { useState } from 'react'
import Button from '../Button'
import CertificateThumbnail from './CertificateThumbnail'
import DocumentUploadField from './DocumentUploadField'
import VerificationSectionShell from './VerificationSectionShell'
import { formatDate } from '../../utils/format'
import { CREDENTIAL_TYPES, RMN_ORGANIZATION_NAME } from '../../utils/verification'
import type { NewCredentialInput, VerificationRecordRef } from '../../services/credentials'
import type { ProfileCredentialRow } from '../../types/domain'

interface StagedFile {
  blob: Blob
  name: string
}

interface RmnSealCardProps {
  isLocked: boolean
  seals: ProfileCredentialRow[]
  removingId: string
  addCredential: (input: NewCredentialInput) => Promise<void>
  removeCredential: (record: VerificationRecordRef) => Promise<void>
  onSaved: (message: string) => void
}

function RmnSealCard({
  isLocked,
  seals,
  removingId,
  addCredential,
  removeCredential,
  onSaved,
}: RmnSealCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [fileError, setFileError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setStaged(null)
    setFileError('')
  }

  const handleSubmit = async () => {
    if (!staged) {
      setFileError('Attach a photo of the RMN seal or membership proof.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addCredential({
        credentialType: CREDENTIAL_TYPES.RMN_SEAL,
        issuingOrganization: RMN_ORGANIZATION_NAME,
        certificateNumber: null,
        file: staged.blob,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('RMN seal added.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the RMN seal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileCredentialRow) => {
    setActionError('')
    try {
      await removeCredential({ id: row.id, documentPath: row.document_path })
      onSaved('RMN seal removed.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove the RMN seal.')
    }
  }

  return (
    <VerificationSectionShell
      title="Rice Farmers' National Network (RMN) Seal"
      description="Display your RMN seal if you are a member of the network."
      addLabel="Add RMN seal"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={seals.length > 0}
      emptyLabel="No RMN seal added yet."
      list={
        <ul className="divide-y divide-hairline border border-hairline">
          {seals.map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-4 p-4 sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CertificateThumbnail
                  storagePath={row.document_path}
                  title="RMN seal"
                />
                <div className="min-w-0">
                  <p className="body-strong text-ink">{RMN_ORGANIZATION_NAME}</p>
                  <p className="caption-sm text-mute">Added {formatDate(row.created_at)}</p>
                </div>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => void handleRemove(row)}
                  disabled={removingId === row.id}
                  className="body-sm shrink-0 text-error transition-opacity hover:opacity-80 disabled:text-ash"
                >
                  {removingId === row.id ? 'Removing\u2026' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      }
    >
      <DocumentUploadField
        id="rmn-seal-document"
        label="RMN seal or membership proof"
        hint="JPEG or PNG, up to 10 MB."
        fileName={staged?.name ?? ''}
        disabled={isSubmitting}
        error={fileError}
        onPick={(blob, name) => {
          setStaged({ blob, name })
          setFileError('')
        }}
        onClear={() => setStaged(null)}
      />
      <div className="mt-5 flex justify-end border-t border-hairline pt-4">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="justify-center"
        >
          {isSubmitting ? 'Saving\u2026' : 'Save RMN seal'}
        </Button>
      </div>
    </VerificationSectionShell>
  )
}

export default RmnSealCard
