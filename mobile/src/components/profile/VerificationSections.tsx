// Verification record sections — RSBSA, PhilRice/BPI credentials, FCA/co-op
// affiliations, LGU/MAO endorsements, and supporting documents. Each card owns
// its add form; list state and mutations come from useVerificationRecords.
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../Button'
import DocumentPickerField from './DocumentPickerField'
import VerificationSectionShell, {
  RemoveRecordButton,
} from './VerificationSectionShell'
import { formatDate, formatDateOnly } from '../../utils/format'
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_LABELS,
  toCredentialType,
} from '../../utils/verification'
import {
  MAX_CERTIFICATE_NUMBER_LENGTH,
  MAX_DOCUMENT_LABEL_LENGTH,
  MAX_ISSUING_OFFICE_LENGTH,
  MAX_LOCATION_FIELD_LENGTH,
  MAX_MEMBERSHIP_ID_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
  validateDateIssued,
  validateRsbsa,
} from '../../utils/verificationValidation'
import type { CredentialType } from '../../utils/verification'
import type {
  NewAffiliationInput,
  NewCredentialInput,
  NewEndorsementInput,
  NewSupportingDocumentInput,
  SaveRsbsaInput,
  VerificationRecordRef,
} from '../../services/credentials'
import type {
  ProfileAffiliationRow,
  ProfileCredentialRow,
  ProfileDocumentRow,
  ProfileEndorsementRow,
} from '../../types/domain'
import type { PreparedImage } from '../../utils/image'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface SectionBaseProps {
  isLocked: boolean
  removingId: string
  onSaved: (message: string) => void
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
}

function DateField({
  value,
  error,
  disabled,
  onChange,
}: {
  value: string
  error?: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <View>
      <Text style={[TYPE.captionMd, styles.label]}>Date issued</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Date issued"
        autoCorrect={false}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {error}
        </Text>
      ) : (
        <Text style={[TYPE.captionSm, styles.hint]}>YYYY-MM-DD</Text>
      )}
    </View>
  )
}

interface RsbsaCardProps {
  isLocked: boolean
  rsbsaNumber: string
  rsbsaDocumentPath: string
  saveRsbsa: (input: SaveRsbsaInput) => Promise<void>
  onSaved: (message: string) => void
}

export function RsbsaCard({
  isLocked,
  rsbsaNumber,
  rsbsaDocumentPath,
  saveRsbsa,
  onSaved,
}: RsbsaCardProps) {
  const [numberInput, setNumberInput] = useState(rsbsaNumber)
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [numberError, setNumberError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = numberInput.trim() !== rsbsaNumber.trim() || image !== null

  const handleSave = async () => {
    const trimmed = numberInput.trim()
    const validationError = trimmed ? validateRsbsa(trimmed) : 'Enter your RSBSA number.'
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
        image: image ?? undefined,
      })
      setImage(null)
      onSaved('RSBSA details saved.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save your RSBSA details.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>RSBSA number</Text>
      <Text style={[TYPE.bodySm, styles.description]}>
        Used for farmer identification, verification, and your profile wall.
      </Text>

      {isLocked ? (
        <View style={styles.locked}>
          <Text style={[TYPE.captionSm, styles.lockedText]}>
            Your profile is verified, so your RSBSA details are locked. Contact the
            review team if you need to correct them.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[TYPE.captionMd, styles.label]}>RSBSA number</Text>
          <TextInput
            style={[styles.input, numberError ? styles.inputError : null]}
            value={numberInput}
            onChangeText={(value) => {
              setNumberInput(value)
              setNumberError('')
            }}
            onBlur={() => {
              if (numberInput.trim()) {
                setNumberError(validateRsbsa(numberInput.trim()))
              }
            }}
            placeholder="RSBSA-12-345678-9012"
            placeholderTextColor={COLORS.ash}
            accessibilityLabel="RSBSA number"
            autoCorrect={false}
          />
          {numberError ? (
            <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
              {numberError}
            </Text>
          ) : (
            <Text style={[TYPE.captionSm, styles.hint]}>
              Example: RSBSA-12-345678-9012
            </Text>
          )}

          <DocumentPickerField
            label="RSBSA certificate/card (optional)"
            hint="Photos only, JPEG or PNG, up to 10 MB."
            selected={image !== null}
            existingLabel={rsbsaDocumentPath ? 'RSBSA document on file' : ''}
            disabled={isSaving}
            onPick={setImage}
            onClear={() => setImage(null)}
          />

          {actionError ? (
            <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
              {actionError}
            </Text>
          ) : null}

          <View style={styles.footer}>
            <Button
              label={isSaving ? 'Saving…' : 'Save RSBSA details'}
              onPress={() => void handleSave()}
              disabled={!isDirty || isSaving}
            />
            <Text style={[TYPE.captionSm, styles.hint]}>
              {isDirty ? 'You have unsaved changes' : 'No unsaved changes'}
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

interface CredentialsCardProps extends SectionBaseProps {
  credentials: ProfileCredentialRow[]
  addCredential: (input: NewCredentialInput) => Promise<void>
  removeCredential: (record: VerificationRecordRef) => Promise<void>
}

export function CredentialsCard({
  isLocked,
  credentials,
  removingId,
  addCredential,
  removeCredential,
  onSaved,
}: CredentialsCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [credentialType, setCredentialType] = useState<CredentialType>(
    CREDENTIAL_TYPES.PHILRICE_TRAINING
  )
  const [organization, setOrganization] = useState('')
  const [certificateNumber, setCertificateNumber] = useState('')
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [errors, setErrors] = useState<{
    organization?: string
    certificateNumber?: string
    file?: string
  }>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setCredentialType(CREDENTIAL_TYPES.PHILRICE_TRAINING)
    setOrganization('')
    setCertificateNumber('')
    setImage(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedOrganization = organization.trim()
    const trimmedCertificate = certificateNumber.trim()
    const nextErrors: typeof errors = {}
    if (!trimmedOrganization) {
      nextErrors.organization = 'Enter the issuing organization.'
    } else if (trimmedOrganization.length > MAX_ORGANIZATION_NAME_LENGTH) {
      nextErrors.organization = `Keep this to ${MAX_ORGANIZATION_NAME_LENGTH} characters or fewer.`
    }
    if (trimmedCertificate.length > MAX_CERTIFICATE_NUMBER_LENGTH) {
      nextErrors.certificateNumber = `Keep this to ${MAX_CERTIFICATE_NUMBER_LENGTH} characters or fewer.`
    }
    if (!image) {
      nextErrors.file = 'Attach a photo of the certificate.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !image) {
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addCredential({
        credentialType,
        issuingOrganization: trimmedOrganization,
        certificateNumber: trimmedCertificate || null,
        image,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Credential added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the credential.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemove = async (row: ProfileCredentialRow) => {
    setActionError('')
    try {
      await removeCredential({ id: row.id, documentPath: row.document_path })
      onSaved('Credential removed.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not remove the credential.'))
    }
  }

  return (
    <VerificationSectionShell
      title="PhilRice / BPI credentials"
      description="Training certificates and seed grower certifications from PhilRice, BPI, or other agriculture programs."
      addLabel="Add credential"
      isLocked={isLocked}
      isAddOpen={isAddOpen}
      onToggleAdd={() => {
        setActionError('')
        setIsAddOpen((current) => !current)
        resetForm()
      }}
      actionError={actionError}
      hasItems={credentials.length > 0}
      emptyLabel="No credentials added yet."
      list={
        <View style={styles.list}>
          {credentials.map((row, index) => (
            <View
              key={row.id}
              style={[styles.row, index > 0 && styles.rowDivider]}
            >
              <View style={styles.rowBody}>
                <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                  {CREDENTIAL_TYPE_LABELS[toCredentialType(row.credential_type)]}
                </Text>
                <Text style={[TYPE.bodySm, styles.rowSub]}>{row.issuing_organization}</Text>
                {row.certificate_number ? (
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Certificate no. {row.certificate_number}
                  </Text>
                ) : null}
                <Text style={[TYPE.captionSm, styles.rowCaption]}>
                  Added {formatDate(row.created_at)}
                </Text>
              </View>
              <RemoveRecordButton
                isRemoving={removingId === row.id}
                disabled={isLocked}
                onPress={() => void handleRemove(row)}
              />
            </View>
          ))}
        </View>
      }
    >
      <Text style={[TYPE.captionMd, styles.label]}>Credential type</Text>
      <View style={styles.pillRow}>
        {Object.values(CREDENTIAL_TYPES).map((type) => {
          const active = credentialType === type
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={isSubmitting}
              onPress={() => setCredentialType(type)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text
                style={[TYPE.buttonSm, styles.pillLabel, active && styles.pillLabelActive]}
              >
                {CREDENTIAL_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={[TYPE.captionMd, styles.label]}>Issuing organization</Text>
      <TextInput
        style={[styles.input, errors.organization ? styles.inputError : null]}
        value={organization}
        onChangeText={(value) => {
          setOrganization(value)
          setErrors((current) => ({ ...current, organization: undefined }))
        }}
        placeholder="PhilRice"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Issuing organization"
        autoCorrect={false}
      />
      {errors.organization ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.organization}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Certificate number (optional)</Text>
      <TextInput
        style={[styles.input, errors.certificateNumber ? styles.inputError : null]}
        value={certificateNumber}
        onChangeText={(value) => {
          setCertificateNumber(value)
          setErrors((current) => ({ ...current, certificateNumber: undefined }))
        }}
        placeholder="CERT-2026-001"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Certificate number"
        autoCorrect={false}
      />
      {errors.certificateNumber ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.certificateNumber}
        </Text>
      ) : null}

      <DocumentPickerField
        label="Certificate photo"
        hint="JPEG or PNG, up to 10 MB."
        selected={image !== null}
        disabled={isSubmitting}
        error={errors.file}
        onPick={(picked) => {
          setImage(picked)
          setErrors((current) => ({ ...current, file: undefined }))
        }}
        onClear={() => setImage(null)}
      />

      <View style={styles.formFooter}>
        <Button
          label={isSubmitting ? 'Saving…' : 'Save credential'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        />
      </View>
    </VerificationSectionShell>
  )
}

interface AffiliationsCardProps extends SectionBaseProps {
  affiliations: ProfileAffiliationRow[]
  addAffiliation: (input: NewAffiliationInput) => Promise<void>
  removeAffiliation: (record: VerificationRecordRef) => Promise<void>
}

export function AffiliationsCard({
  isLocked,
  affiliations,
  removingId,
  addAffiliation,
  removeAffiliation,
  onSaved,
}: AffiliationsCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [organizationName, setOrganizationName] = useState('')
  const [membershipId, setMembershipId] = useState('')
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [errors, setErrors] = useState<{
    organization?: string
    membershipId?: string
    file?: string
  }>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setOrganizationName('')
    setMembershipId('')
    setImage(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedName = organizationName.trim()
    const trimmedMembership = membershipId.trim()
    const nextErrors: typeof errors = {}
    if (!trimmedName) {
      nextErrors.organization = 'Enter the FCA or cooperative name.'
    } else if (trimmedName.length > MAX_ORGANIZATION_NAME_LENGTH) {
      nextErrors.organization = `Keep this to ${MAX_ORGANIZATION_NAME_LENGTH} characters or fewer.`
    }
    if (trimmedMembership.length > MAX_MEMBERSHIP_ID_LENGTH) {
      nextErrors.membershipId = `Keep this to ${MAX_MEMBERSHIP_ID_LENGTH} characters or fewer.`
    }
    if (!image) {
      nextErrors.file = 'Attach a photo of your membership certificate or proof of affiliation.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !image) {
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addAffiliation({
        organizationName: trimmedName,
        membershipId: trimmedMembership || null,
        image,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Affiliation added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the affiliation.'))
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
      setActionError(errorMessage(err, 'Could not remove the affiliation.'))
    }
  }

  return (
    <VerificationSectionShell
      title="FCA / Cooperative affiliation"
      description="Your farmers' cooperative or association membership, with proof of affiliation."
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
        <View style={styles.list}>
          {affiliations.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowBody}>
                <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                  {row.organization_name}
                </Text>
                {row.membership_id ? (
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Membership ID {row.membership_id}
                  </Text>
                ) : null}
                <Text style={[TYPE.captionSm, styles.rowCaption]}>
                  Added {formatDate(row.created_at)}
                </Text>
              </View>
              <RemoveRecordButton
                isRemoving={removingId === row.id}
                disabled={isLocked}
                onPress={() => void handleRemove(row)}
              />
            </View>
          ))}
        </View>
      }
    >
      <Text style={[TYPE.captionMd, styles.label]}>FCA / Cooperative name</Text>
      <TextInput
        style={[styles.input, errors.organization ? styles.inputError : null]}
        value={organizationName}
        onChangeText={(value) => {
          setOrganizationName(value)
          setErrors((current) => ({ ...current, organization: undefined }))
        }}
        placeholder="San Isidro Farmers Cooperative"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="FCA or cooperative name"
        autoCorrect={false}
      />
      {errors.organization ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.organization}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Membership ID (optional)</Text>
      <TextInput
        style={[styles.input, errors.membershipId ? styles.inputError : null]}
        value={membershipId}
        onChangeText={(value) => {
          setMembershipId(value)
          setErrors((current) => ({ ...current, membershipId: undefined }))
        }}
        placeholder="M-2026-001"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Membership ID"
        autoCorrect={false}
      />
      {errors.membershipId ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.membershipId}
        </Text>
      ) : null}

      <DocumentPickerField
        label="Proof of affiliation"
        hint="Membership certificate or cooperative registration document. JPEG or PNG, up to 10 MB."
        selected={image !== null}
        disabled={isSubmitting}
        error={errors.file}
        onPick={(picked) => {
          setImage(picked)
          setErrors((current) => ({ ...current, file: undefined }))
        }}
        onClear={() => setImage(null)}
      />

      <View style={styles.formFooter}>
        <Button
          label={isSubmitting ? 'Saving…' : 'Save affiliation'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        />
      </View>
    </VerificationSectionShell>
  )
}

interface EndorsementsCardProps extends SectionBaseProps {
  endorsements: ProfileEndorsementRow[]
  addEndorsement: (input: NewEndorsementInput) => Promise<void>
  removeEndorsement: (record: VerificationRecordRef) => Promise<void>
}

export function EndorsementsCard({
  isLocked,
  endorsements,
  removingId,
  addEndorsement,
  removeEndorsement,
  onSaved,
}: EndorsementsCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [municipality, setMunicipality] = useState('')
  const [issuingOffice, setIssuingOffice] = useState('')
  const [dateIssued, setDateIssued] = useState('')
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [errors, setErrors] = useState<{
    municipality?: string
    issuingOffice?: string
    dateIssued?: string
    file?: string
  }>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const todayIso = new Date().toISOString().slice(0, 10)

  const resetForm = () => {
    setMunicipality('')
    setIssuingOffice('')
    setDateIssued('')
    setImage(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedMunicipality = municipality.trim()
    const trimmedOffice = issuingOffice.trim()
    const nextErrors: typeof errors = {}
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
    if (!image) {
      nextErrors.file = 'Attach a photo of the endorsement or certification.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !image) {
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addEndorsement({
        municipality: trimmedMunicipality,
        issuingOffice: trimmedOffice,
        dateIssued,
        image,
      })
      resetForm()
      setIsAddOpen(false)
      onSaved('Endorsement added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the endorsement.'))
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
      setActionError(errorMessage(err, 'Could not remove the endorsement.'))
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
        <View style={styles.list}>
          {endorsements.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowBody}>
                <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                  {row.issuing_office}
                </Text>
                <Text style={[TYPE.bodySm, styles.rowSub]}>{row.municipality}</Text>
                <Text style={[TYPE.captionSm, styles.rowCaption]}>
                  Issued {formatDateOnly(row.date_issued)}
                </Text>
                <Text style={[TYPE.captionSm, styles.rowCaption]}>
                  Added {formatDate(row.created_at)}
                </Text>
              </View>
              <RemoveRecordButton
                isRemoving={removingId === row.id}
                disabled={isLocked}
                onPress={() => void handleRemove(row)}
              />
            </View>
          ))}
        </View>
      }
    >
      <Text style={[TYPE.captionMd, styles.label]}>Municipality</Text>
      <TextInput
        style={[styles.input, errors.municipality ? styles.inputError : null]}
        value={municipality}
        onChangeText={(value) => {
          setMunicipality(value)
          setErrors((current) => ({ ...current, municipality: undefined }))
        }}
        placeholder="Munoz"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Municipality"
        autoCorrect={false}
      />
      {errors.municipality ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.municipality}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Issuing office</Text>
      <TextInput
        style={[styles.input, errors.issuingOffice ? styles.inputError : null]}
        value={issuingOffice}
        onChangeText={(value) => {
          setIssuingOffice(value)
          setErrors((current) => ({ ...current, issuingOffice: undefined }))
        }}
        placeholder="Municipal Agriculture Office"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Issuing office"
        autoCorrect={false}
      />
      {errors.issuingOffice ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.issuingOffice}
        </Text>
      ) : null}

      <DateField
        value={dateIssued}
        error={errors.dateIssued}
        disabled={isSubmitting}
        onChange={(value) => {
          setDateIssued(value)
          setErrors((current) => ({ ...current, dateIssued: undefined }))
        }}
      />

      <DocumentPickerField
        label="Endorsement document"
        hint="Barangay endorsement or MAO certification. JPEG or PNG, up to 10 MB."
        selected={image !== null}
        disabled={isSubmitting}
        error={errors.file}
        onPick={(picked) => {
          setImage(picked)
          setErrors((current) => ({ ...current, file: undefined }))
        }}
        onClear={() => setImage(null)}
      />

      <View style={styles.formFooter}>
        <Button
          label={isSubmitting ? 'Saving…' : 'Save endorsement'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        />
      </View>
    </VerificationSectionShell>
  )
}

interface SupportingDocumentsCardProps extends SectionBaseProps {
  documents: ProfileDocumentRow[]
  addSupportingDocument: (input: NewSupportingDocumentInput) => Promise<void>
  removeSupportingDocument: (record: VerificationRecordRef) => Promise<void>
}

export function SupportingDocumentsCard({
  isLocked,
  documents,
  removingId,
  addSupportingDocument,
  removeSupportingDocument,
  onSaved,
}: SupportingDocumentsCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [errors, setErrors] = useState<{ label?: string; file?: string }>({})
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = () => {
    setLabel('')
    setImage(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    const trimmedLabel = label.trim()
    const nextErrors: typeof errors = {}
    if (!trimmedLabel) {
      nextErrors.label = 'Describe the document.'
    } else if (trimmedLabel.length > MAX_DOCUMENT_LABEL_LENGTH) {
      nextErrors.label = `Keep this to ${MAX_DOCUMENT_LABEL_LENGTH} characters or fewer.`
    }
    if (!image) {
      nextErrors.file = 'Attach a photo of the document.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !image) {
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addSupportingDocument({ label: trimmedLabel, image })
      resetForm()
      setIsAddOpen(false)
      onSaved('Document added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the document.'))
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
      setActionError(errorMessage(err, 'Could not remove the document.'))
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
        <View style={styles.list}>
          {documents.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowBody}>
                <Text style={[TYPE.bodyStrong, styles.rowTitle]}>{row.label}</Text>
                <Text style={[TYPE.captionSm, styles.rowCaption]}>
                  Added {formatDate(row.created_at)}
                </Text>
              </View>
              <RemoveRecordButton
                isRemoving={removingId === row.id}
                disabled={isLocked}
                onPress={() => void handleRemove(row)}
              />
            </View>
          ))}
        </View>
      }
    >
      <Text style={[TYPE.captionMd, styles.label]}>Document label</Text>
      <TextInput
        style={[styles.input, errors.label ? styles.inputError : null]}
        value={label}
        onChangeText={(value) => {
          setLabel(value)
          setErrors((current) => ({ ...current, label: undefined }))
        }}
        placeholder="Farm ownership document"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Document label"
        autoCorrect={false}
      />
      {errors.label ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.label}
        </Text>
      ) : null}

      <DocumentPickerField
        label="Document photo"
        hint="JPEG or PNG, up to 10 MB."
        selected={image !== null}
        disabled={isSubmitting}
        error={errors.file}
        onPick={(picked) => {
          setImage(picked)
          setErrors((current) => ({ ...current, file: undefined }))
        }}
        onClear={() => setImage(null)}
      />

      <View style={styles.formFooter}>
        <Button
          label={isSubmitting ? 'Saving…' : 'Save document'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        />
      </View>
    </VerificationSectionShell>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.ink,
  },
  description: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  locked: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  lockedText: {
    color: COLORS.mute,
  },
  label: {
    color: COLORS.ink,
    marginTop: SPACING.lg,
  },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  hint: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  footer: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  formFooter: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
    alignItems: 'flex-end',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  pill: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  pillActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  pillLabel: {
    color: COLORS.ink,
  },
  pillLabelActive: {
    color: COLORS.onDark,
  },
  list: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.lg,
    padding: SPACING.lg,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: COLORS.ink,
  },
  rowSub: {
    color: COLORS.body,
  },
  rowCaption: {
    color: COLORS.mute,
    marginTop: SPACING.xxs,
  },
})

export type { SectionBaseProps }
