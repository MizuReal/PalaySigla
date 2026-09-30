import { useState } from 'react'
import Button from '../Button'
import DocumentUploadField from './DocumentUploadField'
import { SectionError } from './VerificationSectionShell'
import { FORM_FIELD_CLASSES, withFieldError } from '../../utils/formField'
import { validateRsbsa } from '../../utils/verificationValidation'
import type { SaveRsbsaInput } from '../../services/credentials'

const RSBSA_REQUIRED_ERROR = 'Enter your RSBSA number.'
const RSBSA_NUMBER_HINT = 'Example: RSBSA-12-345678-9012'

interface StagedFile {
  blob: Blob
  name: string
}

interface RsbsaSectionProps {
  isLocked: boolean
  rsbsaNumber: string
  rsbsaDocumentPath: string
  saveRsbsa: (input: SaveRsbsaInput) => Promise<void>
  onSaved: (message: string) => void
}

function RsbsaSection({
  isLocked,
  rsbsaNumber,
  rsbsaDocumentPath,
  saveRsbsa,
  onSaved,
}: RsbsaSectionProps) {
  const [numberInput, setNumberInput] = useState(rsbsaNumber)
  const [staged, setStaged] = useState<StagedFile | null>(null)
  const [numberError, setNumberError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  const isDirty = numberInput.trim() !== rsbsaNumber.trim() || staged !== null

  const handleSave = async () => {
    const trimmed = numberInput.trim()
    const validationError = trimmed ? validateRsbsa(trimmed) : RSBSA_REQUIRED_ERROR
    setNumberError(validationError)
    if (validationError) {
      return
    }
    setIsSaving(true)
    setActionError('')
    try {
      await saveRsbsa({
        rsbsaNumber: trimmed,
        documentPath: rsbsaDocumentPath || null,
        file: staged?.blob,
      })
      setStaged(null)
      onSaved('RSBSA details saved.')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not save your RSBSA details.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h3 className="heading-sm text-ink">RSBSA number</h3>
      <p className="body-sm mt-1 text-mute">
        Used for farmer identification, verification, and your profile wall.
      </p>

      {isLocked && (
        <p className="caption-sm mt-4 flex items-start gap-1.5 border border-hairline bg-surface-soft p-3 text-mute">
          Your profile is verified, so your RSBSA details are locked. Contact the
          review team if you need to correct them.
        </p>
      )}

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="rsbsa-number" className="caption-md text-ink">
            RSBSA number
          </label>
          <input
            id="rsbsa-number"
            type="text"
            value={numberInput}
            disabled={isLocked || isSaving}
            placeholder="RSBSA-12-345678-9012"
            onChange={(event) => {
              setNumberInput(event.target.value)
              setNumberError('')
            }}
            onBlur={() => {
              const trimmed = numberInput.trim()
              if (trimmed) {
                setNumberError(validateRsbsa(trimmed))
              }
            }}
            aria-invalid={numberError ? true : undefined}
            className={`mt-2 ${withFieldError(FORM_FIELD_CLASSES, Boolean(numberError))} disabled:bg-surface-soft disabled:text-ash`}
          />
          {numberError ? (
            <p className="caption-sm mt-2 text-error" role="alert">
              {numberError}
            </p>
          ) : (
            <p className="caption-sm mt-2 text-mute">{RSBSA_NUMBER_HINT}</p>
          )}
        </div>
        <DocumentUploadField
          id="rsbsa-document"
          label="RSBSA certificate/card (optional)"
          hint="Photos only, JPEG or PNG, up to 10 MB."
          fileName={staged?.name ?? (rsbsaDocumentPath ? 'RSBSA document on file' : '')}
          disabled={isLocked || isSaving}
          onPick={(blob, name) => setStaged({ blob, name })}
          onClear={() => setStaged(null)}
        />
      </div>

      {actionError ? (
        <div className="mt-4">
          <SectionError message={actionError} />
        </div>
      ) : null}

      {!isLocked && (
        <div className="mt-5 flex items-center justify-between border-t border-hairline pt-4">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="justify-center"
          >
            {isSaving ? 'Saving\u2026' : 'Save RSBSA details'}
          </Button>
          <p className="caption-sm text-mute" aria-live="polite">
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </p>
        </div>
      )}
    </section>
  )
}

export default RsbsaSection
