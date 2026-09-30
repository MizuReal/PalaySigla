import { useState } from 'react'
import Button from '../Button'
import DocumentUploadField from './DocumentUploadField'
import VerificationSectionShell from './VerificationSectionShell'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'
import { formatDate } from '../../utils/format'
import { MAX_DOCUMENT_LABEL_LENGTH } from '../../utils/verificationValidation'
import type {
  NewSupportingDocumentInput,
  VerificationRecordRef,
} from '../../services/credentials'
import type { ProfileDocumentRow } from '../../types/domain'

interface StagedFile {
  blob: Blob
  name: string
}

interface FormErrors {
  label?: string
  file?: string
}

interface SupportingDocumentsSectionProps {
  isLocked: boolean
  documents: ProfileDocumentRow[]
  removingId: string
  addSupportingDocument: (input: NewSupportingDocumentInput) => Promise<void>
  removeSupportingDocument: (record: VerificationRecordRef) => Promise<void>
  onSaved: (message: string) => void
}

function SupportingDocumentsSection({
  isLocked,
  documents,
  removingId,
  addSupportingDocument,
  removeSupportingDocument,
  onSaved,
}: SupportingDocumentsSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setLabel('')
    setStaged(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedLabel = label.trim()
    const nextErrors: FormErrors = {}
    if (!trimmedLabel) {
      nextErrors.label = 'Describe the document.'
    } else if (trimmedLabel.length > MAX_DOCUMENT_LABEL_LENGTH) {
      nextErrors.label = `Keep this to ${MAX_DOCUMENT_LABEL_LENGTH} characters or fewer.`
    }
    if (!staged) {
      nextErrors.file = 'Attach a photo of the document.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !staged) {
      return
    }

    setIsSubmitting(true)
    setActionError('')
    try {
      await addSupportingDocument({ label: trimmedLabel, file: staged.blob })
      resetForm()
      setIsAddOpen(false)
      onSaved('Document added.')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save the document.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileDocumentRow) => {
    setActionError('')
    try {
      await removeSupportingDocument({ id: row.id, documentPath: row.document_path })
      onSaved('Document removed.')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove the document.'
      )
    }
  }

  return (
    <VerificationSectionShell
      title="Supporting documents"
      description="Farmer ID, registration papers, farm ownership or tenancy documents, farm photos, and anything else that supports your verification."
      addLabel="Add document"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={documents.length > 0}
      emptyLabel="No supporting documents added yet."
      list={
        <ul className="divide-y divide-hairline border border-hairline">
          {documents.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="body-strong text-ink">{row.label}</p>
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
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="document-label" className="caption-md text-ink">
            Document label
          </label>
          <input
            id="document-label"
            type="text"
            value={label}
            disabled={isSubmitting}
            placeholder="Farm ownership document"
            onChange={(event) => {
              setLabel(event.target.value)
              setErrors((current) => ({ ...current, label: undefined }))
            }}
            aria-invalid={errors.label ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(errors.label))}`}
          />
          {errors.label ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {errors.label}
            </p>
          ) : null}
        </div>
        <DocumentUploadField
          id="document-file"
          label="Document photo"
          hint="JPEG or PNG, up to 10 MB."
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
          {isSubmitting ? 'Saving\u2026' : 'Save document'}
        </Button>
      </div>
    </VerificationSectionShell>
  )
}

export default SupportingDocumentsSection
