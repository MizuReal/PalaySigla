import { useState } from 'react'
import Button from '../Button'
import DocumentUploadField from './DocumentUploadField'
import VerificationSectionShell from './VerificationSectionShell'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'
import { formatDate, formatDateOnly } from '../../utils/format'
import {
  MAX_ISSUING_OFFICE_LENGTH,
  MAX_LOCATION_FIELD_LENGTH,
  validateDateIssued,
} from '../../utils/verificationValidation'
import type { NewEndorsementInput, VerificationRecordRef } from '../../services/credentials'
import type { ProfileEndorsementRow } from '../../types/domain'

interface StagedFile {
  blob: Blob
  name: string
}

interface FormErrors {
  municipality?: string
  issuingOffice?: string
  dateIssued?: string
  file?: string
}

interface EndorsementSectionProps {
  isLocked: boolean
  endorsements: ProfileEndorsementRow[]
  removingId: string
  addEndorsement: (input: NewEndorsementInput) => Promise<void>
  removeEndorsement: (record: VerificationRecordRef) => Promise<void>
  onSaved: (message: string) => void
}

function EndorsementSection({
  isLocked,
  endorsements,
  removingId,
  addEndorsement,
  removeEndorsement,
  onSaved,
}: EndorsementSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [municipality, setMunicipality] = useState('')
  const [issuingOffice, setIssuingOffice] = useState('')
  const [dateIssued, setDateIssued] = useState('')
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayIso = new Date().toISOString().slice(0, 10)

  const resetForm = () => {
    setMunicipality('')
    setIssuingOffice('')
    setDateIssued('')
    setStaged(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedMunicipality = municipality.trim()
    const trimmedOffice = issuingOffice.trim()
    const nextErrors: FormErrors = {}
    if (!trimmedMunicipality) {
      nextErrors.municipality = 'Enter the municipality.'
    } else if (trimmedMunicipality.length > MAX_LOCATION_FIELD_LENGTH) {
      nextErrors.municipality = `Keep this to ${MAX_LOCATION_FIELD_LENGTH} characters or fewer.`
    }
    if (!trimmedOffice) {
      nextErrors.issuingOffice = 'Enter the issuing office.'
    } else if (trimmedOffice.length > MAX_ISSUING_OFFICE_LENGTH) {
      nextErrors.issuingOffice = `Keep this to ${MAX_ISSUING_OFFICE_LENGTH} characters or fewer.`
    }
    const dateError = validateDateIssued(dateIssued, todayIso)
    if (dateError) {
      nextErrors.dateIssued = dateError
    }
    if (!staged) {
      nextErrors.file = 'Attach a photo of the endorsement or certification.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !staged) {
      return
    }

    setIsSubmitting(true)
    setActionError('')
    try {
      await addEndorsement({
        municipality: trimmedMunicipality,
        issuingOffice: trimmedOffice,
        dateIssued,
        file: staged.blob,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Endorsement added.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the endorsement.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileEndorsementRow) => {
    setActionError('')
    try {
      await removeEndorsement({ id: row.id, documentPath: row.document_path })
      onSaved('Endorsement removed.')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove the endorsement.'
      )
    }
  }

  return (
    <VerificationSectionShell
      title="LGU / MAO endorsement"
      description="Certification or endorsement from your barangay, municipality, or Municipal Agriculture Office."
      addLabel="Add endorsement"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={endorsements.length > 0}
      emptyLabel="No endorsements added yet."
      list={
        <ul className="divide-y divide-hairline border border-hairline">
          {endorsements.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="body-strong text-ink">{row.issuing_office}</p>
                <p className="body-sm text-body">{row.municipality}</p>
                <p className="caption-sm text-mute">
                  Issued {formatDateOnly(row.date_issued)}
                </p>
                <p className="caption-sm text-mute">Added {formatDate(row.created_at)}</p>
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
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="min-w-0">
          <label htmlFor="endorsement-municipality" className="caption-md text-ink">
            Municipality
          </label>
          <input
            id="endorsement-municipality"
            type="text"
            value={municipality}
            disabled={isSubmitting}
            placeholder="Munoz"
            onChange={(event) => {
              setMunicipality(event.target.value)
              setErrors((current) => ({ ...current, municipality: undefined }))
            }}
            aria-invalid={errors.municipality ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.municipality))}`}
          />
          {errors.municipality ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.municipality}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <label htmlFor="endorsement-office" className="caption-md text-ink">
            Issuing office
          </label>
          <input
            id="endorsement-office"
            type="text"
            value={issuingOffice}
            disabled={isSubmitting}
            placeholder="Municipal Agriculture Office"
            onChange={(event) => {
              setIssuingOffice(event.target.value)
              setErrors((current) => ({ ...current, issuingOffice: undefined }))
            }}
            aria-invalid={errors.issuingOffice ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.issuingOffice))}`}
          />
          {errors.issuingOffice ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.issuingOffice}
            </p>
          ) : null}
        </div>
        <div className="min-w-0">
          <label htmlFor="endorsement-date" className="caption-md text-ink">
            Date issued
          </label>
          <input
            id="endorsement-date"
            type="date"
            value={dateIssued}
            max={todayIso}
            disabled={isSubmitting}
            onChange={(event) => {
              setDateIssued(event.target.value)
              setErrors((current) => ({ ...current, dateIssued: undefined }))
            }}
            aria-invalid={errors.dateIssued ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.dateIssued))}`}
          />
          {errors.dateIssued ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.dateIssued}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-3">
          <DocumentUploadField
            id="endorsement-document"
            label="Endorsement document"
            hint="Barangay endorsement or MAO certification. JPEG or PNG, up to 10 MB."
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
          {isSubmitting ? 'Saving\u2026' : 'Save endorsement'}
        </Button>
      </div>
    </VerificationSectionShell>
  )
}

export default EndorsementSection
