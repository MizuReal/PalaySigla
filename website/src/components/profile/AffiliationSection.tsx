import { useState } from 'react'
import Button from '../Button'
import CertificateThumbnail from './CertificateThumbnail'
import DocumentUploadField from './DocumentUploadField'
import VerificationSectionShell from './VerificationSectionShell'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'
import { formatDate } from '../../utils/format'
import {
  MAX_MEMBERSHIP_ID_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
} from '../../utils/verificationValidation'
import type { NewAffiliationInput, VerificationRecordRef } from '../../services/credentials'
import type { ProfileAffiliationRow } from '../../types/domain'

interface StagedFile {
  blob: Blob
  name: string
}

interface FormErrors {
  organization?: string
  membershipId?: string
  file?: string
}

interface AffiliationSectionProps {
  isLocked: boolean
  affiliations: ProfileAffiliationRow[]
  removingId: string
  addAffiliation: (input: NewAffiliationInput) => Promise<void>
  removeAffiliation: (record: VerificationRecordRef) => Promise<void>
  onSaved: (message: string) => void
}

function AffiliationSection({
  isLocked,
  affiliations,
  removingId,
  addAffiliation,
  removeAffiliation,
  onSaved,
}: AffiliationSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [membershipId, setMembershipId] = useState('')
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setOrganizationName('')
    setMembershipId('')
    setStaged(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedName = organizationName.trim()
    const trimmedMembership = membershipId.trim()
    const nextErrors: FormErrors = {}
    if (!trimmedName) {
      nextErrors.organization = 'Enter the FCA or cooperative name.'
    } else if (trimmedName.length > MAX_ORGANIZATION_NAME_LENGTH) {
      nextErrors.organization = `Keep this to ${MAX_ORGANIZATION_NAME_LENGTH} characters or fewer.`
    }
    if (trimmedMembership.length > MAX_MEMBERSHIP_ID_LENGTH) {
      nextErrors.membershipId = `Keep this to ${MAX_MEMBERSHIP_ID_LENGTH} characters or fewer.`
    }
    if (!staged) {
      nextErrors.file = 'Attach a photo of your membership certificate or proof of affiliation.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !staged) {
      return
    }

    setIsSubmitting(true)
    setActionError('')
    try {
      await addAffiliation({
        organizationName: trimmedName,
        membershipId: trimmedMembership || null,
        file: staged.blob,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Affiliation added.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the affiliation.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileAffiliationRow) => {
    setActionError('')
    try {
      await removeAffiliation({ id: row.id, documentPath: row.proof_path })
      onSaved('Affiliation removed.')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove the affiliation.'
      )
    }
  }

  return (
    <VerificationSectionShell
      title="FCA / Farmers' Association / Cooperative Membership"
      description="Display your cooperative or farmers' association affiliation. Hide membership IDs and sensitive membership information before uploading."
      addLabel="Add affiliation"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={affiliations.length > 0}
      emptyLabel="No affiliations added yet."
      list={
        <ul className="divide-y divide-hairline border border-hairline">
          {affiliations.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <CertificateThumbnail
                  storagePath={row.proof_path}
                  title={`${row.organization_name} proof of affiliation`}
                />
                <div className="min-w-0">
                  <p className="body-strong text-ink">{row.organization_name}</p>
                  {row.membership_id ? (
                    <p className="caption-sm text-mute">
                      Membership ID {row.membership_id}
                    </p>
                  ) : null}
                  <p className="caption-sm text-mute">Added {formatDate(row.created_at)}</p>
                </div>
              </div>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => void handleRemove(row)}
                  disabled={removingId === row.id}
                  className="body-sm shrink-0 self-start text-error transition-opacity hover:opacity-80 disabled:text-ash"
                >
                  {removingId === row.id ? 'Removing\u2026' : 'Remove'}
                </button>
              )}
            </li>
          ))}
        </ul>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="affiliation-organization" className="caption-md text-ink">
            FCA / Cooperative name
          </label>
          <input
            id="affiliation-organization"
            type="text"
            value={organizationName}
            disabled={isSubmitting}
            placeholder="San Isidro Farmers Cooperative"
            onChange={(event) => {
              setOrganizationName(event.target.value)
              setErrors((current) => ({ ...current, organization: undefined }))
            }}
            aria-invalid={errors.organization ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.organization))}`}
          />
          {errors.organization ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.organization}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <label htmlFor="affiliation-membership" className="caption-md text-ink">
            Membership ID (optional)
          </label>
          <input
            id="affiliation-membership"
            type="text"
            value={membershipId}
            disabled={isSubmitting}
            placeholder="M-2026-001"
            onChange={(event) => {
              setMembershipId(event.target.value)
              setErrors((current) => ({ ...current, membershipId: undefined }))
            }}
            aria-invalid={errors.membershipId ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.membershipId))}`}
          />
          {errors.membershipId ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.membershipId}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <DocumentUploadField
            id="affiliation-proof"
            label="Proof of affiliation"
            hint="Hide membership IDs and other sensitive membership information before uploading. JPEG or PNG, up to 10 MB."
            fileName={staged?.name ?? ''}
            disabled={isSubmitting}
            error={errors.file}
            onPick={(blob, name) => {
              setStaged({ blob, name })
              setErrors((current) => ({ ...current, file: undefined }))
            }}
            onClear={() => setStaged(null)}
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end border-t border-hairline pt-4">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="justify-center"
        >
          {isSubmitting ? 'Saving\u2026' : 'Save affiliation'}
        </Button>
      </div>
    </VerificationSectionShell>
  )
}

export default AffiliationSection
