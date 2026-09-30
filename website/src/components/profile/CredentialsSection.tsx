import { useState } from 'react'
import Button from '../Button'
import CertificateThumbnail from './CertificateThumbnail'
import DocumentUploadField from './DocumentUploadField'
import VerificationSectionShell from './VerificationSectionShell'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'
import { formatDate } from '../../utils/format'
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_LABELS,
  toCredentialType,
} from '../../utils/verification'
import {
  MAX_CERTIFICATE_NUMBER_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
} from '../../utils/verificationValidation'
import type { CredentialType } from '../../utils/verification'
import type { NewCredentialInput, VerificationRecordRef } from '../../services/credentials'
import type { ProfileCredentialRow } from '../../types/domain'

const CERTIFICATION_TYPES: readonly CredentialType[] = Object.freeze(
  Object.values(CREDENTIAL_TYPES).filter(
    (type) => type !== CREDENTIAL_TYPES.RMN_SEAL
  )
)

interface StagedFile {
  blob: Blob
  name: string
}

interface FormErrors {
  organization?: string
  certificateNumber?: string
  file?: string
}

interface CredentialsSectionProps {
  isLocked: boolean
  credentials: ProfileCredentialRow[]
  removingId: string
  addCredential: (input: NewCredentialInput) => Promise<void>
  removeCredential: (record: VerificationRecordRef) => Promise<void>
  onSaved: (message: string) => void
}

function CredentialsSection({
  isLocked,
  credentials,
  removingId,
  addCredential,
  removeCredential,
  onSaved,
}: CredentialsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [credentialType, setCredentialType] = useState<CredentialType>(
    CREDENTIAL_TYPES.BPI_SEED_GROWER
  )
  const [organization, setOrganization] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setCredentialType(CREDENTIAL_TYPES.BPI_SEED_GROWER)
    setOrganization('')
    setCertificateNumber('')
    setStaged(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedOrganization = organization.trim()
    const trimmedCertificate = certificateNumber.trim()
    const nextErrors: FormErrors = {}
    if (!trimmedOrganization) {
      nextErrors.organization = 'Enter the issuing organization.'
    } else if (trimmedOrganization.length > MAX_ORGANIZATION_NAME_LENGTH) {
      nextErrors.organization = `Keep this to ${MAX_ORGANIZATION_NAME_LENGTH} characters or fewer.`
    }
    if (trimmedCertificate.length > MAX_CERTIFICATE_NUMBER_LENGTH) {
      nextErrors.certificateNumber = `Keep this to ${MAX_CERTIFICATE_NUMBER_LENGTH} characters or fewer.`
    }
    if (!staged) {
      nextErrors.file = 'Attach a photo of the certificate.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !staged) {
      return
    }

    setIsSubmitting(true)
    setActionError('')
    try {
      await addCredential({
        credentialType,
        issuingOrganization: trimmedOrganization,
        certificateNumber: trimmedCertificate || null,
        file: staged.blob,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Certification added.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the certification.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileCredentialRow) => {
    setActionError('')
    try {
      await removeCredential({ id: row.id, documentPath: row.document_path })
      onSaved('Certification removed.')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove the certification.'
      )
    }
  }

  return (
    <VerificationSectionShell
      title="Certifications and accreditations"
      description="PhilGAP, BPI seed grower, SRP verification, and other agriculture-related certifications."
      addLabel="Add certification"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={credentials.length > 0}
      emptyLabel="No certifications added yet."
      list={
        <ul className="divide-y divide-hairline border border-hairline">
          {credentials.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-3">
                <CertificateThumbnail
                  storagePath={row.document_path}
                  title={CREDENTIAL_TYPE_LABELS[toCredentialType(row.credential_type)]}
                />
                <div className="min-w-0">
                  <p className="body-strong text-ink">
                    {CREDENTIAL_TYPE_LABELS[toCredentialType(row.credential_type)]}
                  </p>
                  <p className="body-sm text-body">{row.issuing_organization}</p>
                  {row.certificate_number ? (
                    <p className="caption-sm text-mute">
                      Certificate no. {row.certificate_number}
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
        <div className="min-w-0 sm:col-span-2">
          <label htmlFor="credential-type" className="caption-md text-ink">
            Certification type
          </label>
          <select
            id="credential-type"
            value={credentialType}
            disabled={isSubmitting}
            onChange={(event) => setCredentialType(toCredentialType(event.target.value))}
            className={`mt-2 ${FORM_FIELD_CLASSES}`}
          >
            {CERTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {CREDENTIAL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="credential-organization" className="caption-md text-ink">
            Issuing organization
          </label>
          <input
            id="credential-organization"
            type="text"
            value={organization}
            disabled={isSubmitting}
            placeholder="PhilGAP / BPI / PhilRice"
            onChange={(event) => {
              setOrganization(event.target.value)
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
          <label htmlFor="credential-number" className="caption-md text-ink">
            Certificate number (optional)
          </label>
          <input
            id="credential-number"
            type="text"
            value={certificateNumber}
            disabled={isSubmitting}
            placeholder="CERT-2026-001"
            onChange={(event) => {
              setCertificateNumber(event.target.value)
              setErrors((current) => ({ ...current, certificateNumber: undefined }))
            }}
            aria-invalid={errors.certificateNumber ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.certificateNumber))}`}
          />
          {errors.certificateNumber ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.certificateNumber}
            </p>
          ) : null}
        </div>
        <DocumentUploadField
          id="credential-document"
          label="Certificate photo"
          hint="Make sure the certificate details are readable. JPEG or PNG, up to 10 MB."
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
      <div className="mt-5 flex justify-end border-t border-hairline pt-4">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSubmitting}
          className="justify-center"
        >
          {isSubmitting ? 'Saving\u2026' : 'Save certification'}
        </Button>
      </div>
    </VerificationSectionShell>
  )
}

export default CredentialsSection
