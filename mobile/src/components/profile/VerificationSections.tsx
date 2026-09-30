// Verification record sections — RSBSA stub, RMN seal, certifications,
// barangay/cooperative endorsements, and FCA/co-op affiliations. Each card
// owns its add form; list state and mutations come from useVerificationRecords.
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../Button'
import CertificateThumbnail from './CertificateThumbnail'
import DocumentPickerField from './DocumentPickerField'
import VerificationSectionShell, {
  RemoveRecordButton,
} from './VerificationSectionShell'
import { formatDate, formatDateOnly } from '../../utils/format'
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_LABELS,
  ENDORSEMENT_TYPES,
  ENDORSEMENT_TYPE_LABELS,
  RMN_ORGANIZATION_NAME,
  toCredentialType,
} from '../../utils/verification'
import {
  MAX_CERTIFICATE_NUMBER_LENGTH,
  MAX_ISSUING_OFFICE_LENGTH,
  MAX_LOCATION_FIELD_LENGTH,
  MAX_MEMBERSHIP_ID_LENGTH,
  MAX_ORGANIZATION_NAME_LENGTH,
  validateDateIssued,
  validateRsbsa,
} from '../../utils/verificationValidation'
import type { CredentialType, EndorsementType } from '../../utils/verification'
import type {
  NewAffiliationInput,
  NewCredentialInput,
  NewEndorsementInput,
  SaveRsbsaInput,
  VerificationRecordRef,
} from '../../services/credentials'
import type {
  ProfileAffiliationRow,
  ProfileCredentialRow,
  ProfileEndorsementRow,
} from '../../types/domain'
import type { PreparedImage } from '../../utils/image'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const CERTIFICATION_TYPES: readonly CredentialType[] = Object.freeze(
  Object.values(CREDENTIAL_TYPES).filter(
    (type) => type !== CREDENTIAL_TYPES.RMN_SEAL
  )
)

interface SectionBaseProps {
  isLocked: boolean
  removingId: string
  onSaved: (message: string) => void
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback
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
      <Text style={[TYPE.headingSm, styles.title]}>RSBSA Control Number Stub</Text>
      <Text style={[TYPE.bodySm, styles.description]}>
        Upload a photo of your RSBSA registration stub. The stub appears on your
        public profile wall with the number hidden.
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
              Used for verification and never shown on your public profile.
            </Text>
          )}

          <DocumentPickerField
            label="RSBSA stub photo"
            hint="Cover or blur the RSBSA number before uploading. The official DA/MAO stamp or logo may remain visible."
            selected={image !== null}
            existingLabel={rsbsaDocumentPath ? 'RSBSA stub on file' : ''}
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

      {rsbsaDocumentPath ? (
        <View style={styles.currentRow}>
          <CertificateThumbnail storagePath={rsbsaDocumentPath} title="RSBSA stub" />
          <Text style={[TYPE.captionSm, styles.hint]}>
            View the stub currently on file.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

interface RmnSealCardProps extends SectionBaseProps {
  seals: ProfileCredentialRow[]
  addCredential: (input: NewCredentialInput) => Promise<void>
  removeCredential: (record: VerificationRecordRef) => Promise<void>
}

export function RmnSealCard({
  isLocked,
  seals,
  removingId,
  addCredential,
  removeCredential,
  onSaved,
}: RmnSealCardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [fileError, setFileError] = useState('')
  const [actionError, setActionError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!image) {
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
        image,
      })
      setImage(null)
      setIsAddOpen(false)
      onSaved('RMN seal added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the RMN seal.'))
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
      setActionError(errorMessage(err, 'Could not remove the RMN seal.'))
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
        setImage(null)
        setFileError('')
      }}
      actionError={actionError}
      hasItems={seals.length > 0}
      emptyLabel="No RMN seal added yet."
      list={
        <View style={styles.list}>
          {seals.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowContent}>
                <CertificateThumbnail storagePath={row.document_path} title="RMN seal" />
                <View style={styles.rowBody}>
                  <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                    {RMN_ORGANIZATION_NAME}
                  </Text>
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Added {formatDate(row.created_at)}
                  </Text>
                </View>
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
      <DocumentPickerField
        label="RMN seal or membership proof"
        hint="JPEG or PNG, up to 10 MB."
        selected={image !== null}
        disabled={isSubmitting}
        error={fileError}
        onPick={(picked) => {
          setImage(picked)
          setFileError('')
        }}
        onClear={() => setImage(null)}
      />
      <View style={styles.formFooter}>
        <Button
          label={isSubmitting ? 'Saving…' : 'Save RMN seal'}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting}
        />
      </View>
    </VerificationSectionShell>
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
    CREDENTIAL_TYPES.BPI_SEED_GROWER
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
    setCredentialType(CREDENTIAL_TYPES.BPI_SEED_GROWER)
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
      onSaved('Certification added.')
    } catch (err) {
      setActionError(errorMessage(err, 'Could not save the certification.'))
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
      setActionError(errorMessage(err, 'Could not remove the certification.'))
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
        <View style={styles.list}>
          {credentials.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowContent}>
                <CertificateThumbnail
                  storagePath={row.document_path}
                  title={CREDENTIAL_TYPE_LABELS[toCredentialType(row.credential_type)]}
                />
                <View style={styles.rowBody}>
                  <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                    {CREDENTIAL_TYPE_LABELS[toCredentialType(row.credential_type)]}
                  </Text>
                  <Text style={[TYPE.bodySm, styles.rowSub]}>
                    {row.issuing_organization}
                  </Text>
                  {row.certificate_number ? (
                    <Text style={[TYPE.captionSm, styles.rowCaption]}>
                      Certificate no. {row.certificate_number}
                    </Text>
                  ) : null}
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Added {formatDate(row.created_at)}
                  </Text>
                </View>
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
      <Text style={[TYPE.captionMd, styles.label]}>Certification type</Text>
      <View style={styles.pillRow}>
        {CERTIFICATION_TYPES.map((type) => {
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
        placeholder="PhilGAP / BPI / PhilRice"
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
        hint="Make sure the certificate details are readable. JPEG or PNG, up to 10 MB."
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
          label={isSubmitting ? 'Saving…' : 'Save certification'}
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
        <View style={styles.list}>
          {affiliations.map((row, index) => (
            <View key={row.id} style={[styles.row, index > 0 && styles.rowDivider]}>
              <View style={styles.rowContent}>
                <CertificateThumbnail
                  storagePath={row.proof_path}
                  title={`${row.organization_name} proof of affiliation`}
                />
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
        hint="Hide membership IDs and other sensitive membership information before uploading. JPEG or PNG, up to 10 MB."
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
  const [endorsementType, setEndorsementType] = useState<EndorsementType>(
    ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION
  )
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
    setEndorsementType(ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION)
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
      nextErrors.municipality = 'Enter the barangay or municipality.'
    } else if (trimmedMunicipality.length > MAX_LOCATION_FIELD_LENGTH) {
      nextErrors.municipality = `Keep this to ${MAX_LOCATION_FIELD_LENGTH} characters or fewer.`
    }
    if (!trimmedOffice) {
      nextErrors.issuingOffice = 'Enter the issuing office or cooperative.'
    } else if (trimmedOffice.length > MAX_ISSUING_OFFICE_LENGTH) {
      nextErrors.issuingOffice = `Keep this to ${MAX_ISSUING_OFFICE_LENGTH} characters or fewer.`
    }
    const dateError = validateDateIssued(dateIssued, todayIso)
    if (dateError) {
      nextErrors.dateIssued = dateError
    }
    if (!image) {
      nextErrors.file = 'Attach a photo of the certification.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || !image) {
      return
    }
    setIsSubmitting(true)
    setActionError('')
    try {
      await addEndorsement({
        endorsementType,
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
      title="Local government and cooperative endorsements"
      description="Barangay agricultural certification and cooperative recognition or officer certificates."
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
              <View style={styles.rowContent}>
                <CertificateThumbnail
                  storagePath={row.document_path}
                  title={
                    row.endorsement_type === ENDORSEMENT_TYPES.COOP_RECOGNITION
                      ? ENDORSEMENT_TYPE_LABELS[ENDORSEMENT_TYPES.COOP_RECOGNITION]
                      : ENDORSEMENT_TYPE_LABELS[ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION]
                  }
                />
                <View style={styles.rowBody}>
                  <Text style={[TYPE.bodyStrong, styles.rowTitle]}>
                    {row.endorsement_type === ENDORSEMENT_TYPES.COOP_RECOGNITION
                      ? ENDORSEMENT_TYPE_LABELS[ENDORSEMENT_TYPES.COOP_RECOGNITION]
                      : ENDORSEMENT_TYPE_LABELS[ENDORSEMENT_TYPES.BARANGAY_CERTIFICATION]}
                  </Text>
                  <Text style={[TYPE.bodySm, styles.rowSub]}>{row.issuing_office}</Text>
                  <Text style={[TYPE.bodySm, styles.rowSub]}>{row.municipality}</Text>
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Issued {formatDateOnly(row.date_issued)}
                  </Text>
                  <Text style={[TYPE.captionSm, styles.rowCaption]}>
                    Added {formatDate(row.created_at)}
                  </Text>
                </View>
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
      <Text style={[TYPE.captionMd, styles.label]}>Endorsement type</Text>
      <View style={styles.pillRow}>
        {Object.values(ENDORSEMENT_TYPES).map((type) => {
          const active = endorsementType === type
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              disabled={isSubmitting}
              onPress={() => setEndorsementType(type)}
              style={[styles.pill, active && styles.pillActive]}
            >
              <Text
                style={[TYPE.buttonSm, styles.pillLabel, active && styles.pillLabelActive]}
              >
                {ENDORSEMENT_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={[TYPE.captionMd, styles.label]}>Barangay / Municipality</Text>
      <TextInput
        style={[styles.input, errors.municipality ? styles.inputError : null]}
        value={municipality}
        onChangeText={(value) => {
          setMunicipality(value)
          setErrors((current) => ({ ...current, municipality: undefined }))
        }}
        placeholder="San Isidro, Munoz"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Barangay or municipality"
        autoCorrect={false}
      />
      {errors.municipality ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.municipality}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Issuing office or cooperative</Text>
      <TextInput
        style={[styles.input, errors.issuingOffice ? styles.inputError : null]}
        value={issuingOffice}
        onChangeText={(value) => {
          setIssuingOffice(value)
          setErrors((current) => ({ ...current, issuingOffice: undefined }))
        }}
        placeholder="Barangay Agriculture Office"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Issuing office or cooperative"
        autoCorrect={false}
      />
      {errors.issuingOffice ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.issuingOffice}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Date issued</Text>
      <TextInput
        style={[styles.input, errors.dateIssued ? styles.inputError : null]}
        value={dateIssued}
        onChangeText={(value) => {
          setDateIssued(value)
          setErrors((current) => ({ ...current, dateIssued: undefined }))
        }}
        editable={!isSubmitting}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Date issued"
        autoCorrect={false}
      />
      {errors.dateIssued ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.dateIssued}
        </Text>
      ) : (
        <Text style={[TYPE.captionSm, styles.hint]}>YYYY-MM-DD</Text>
      )}

      <DocumentPickerField
        label="Certification document"
        hint="Hide any sensitive personal information before uploading. JPEG or PNG, up to 10 MB."
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
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
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
  rowContent: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
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
