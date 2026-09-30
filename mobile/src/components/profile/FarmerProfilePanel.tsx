// Farmer profile management panel — the Settings "Farmer profile" tab. Owns
// the verification-record hook and composes the farm details card, the status
// card, and the three taxonomy groups.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import FarmerDetailsCard from './FarmerDetailsCard'
import VerificationStatusBadge from './VerificationStatusBadge'
import {
  AffiliationsCard,
  CredentialsCard,
  EndorsementsCard,
  RmnSealCard,
  RsbsaCard,
} from './VerificationSections'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import useVerificationRecords from '../../hooks/useVerificationRecords'
import { CREDENTIAL_TYPES, toCredentialType, VERIFICATION_STATUSES } from '../../utils/verification'
import type { VerificationStatus } from '../../utils/verification'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const STATUS_EXPLANATIONS: Record<VerificationStatus, string> = {
  [VERIFICATION_STATUSES.UNVERIFIED]:
    'Add at least one certificate or registration to start the verification process. Uploaded files already appear on your public profile wall.',
  [VERIFICATION_STATUSES.PENDING]:
    'Your documents are in. Our team reviews every submission before granting the Verified Rice Farmer badge.',
  [VERIFICATION_STATUSES.VERIFIED]:
    'Your documents were reviewed and approved. The Verified Rice Farmer badge appears on your profile wall.',
}

interface FarmerProfilePanelProps {
  onOpenProfile: () => void
}

function FarmerProfilePanel({ onOpenProfile }: FarmerProfilePanelProps) {
  const { showToast } = useToast()
  const {
    verificationStatus,
    isLocked,
    rsbsaNumber,
    rsbsaDocumentPath,
    records,
    isInitialLoading,
    loadError,
    retryLoad,
    removingId,
    saveRsbsa,
    addCredential,
    removeCredential,
    addAffiliation,
    removeAffiliation,
    addEndorsement,
    removeEndorsement,
  } = useVerificationRecords()

  const notify = (message: string) => {
    showToast(message, TOAST_VARIANTS.SUCCESS)
  }

  if (isInitialLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={styles.errorCard}>
        <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.errorText]}>
          {loadError}
        </Text>
        <View style={styles.retryWrap}>
          <Button label="Try again" onPress={retryLoad} />
        </View>
      </View>
    )
  }

  const seals = records.credentials.filter(
    (credential) => toCredentialType(credential.credential_type) === CREDENTIAL_TYPES.RMN_SEAL
  )
  const certifications = records.credentials.filter(
    (credential) => toCredentialType(credential.credential_type) !== CREDENTIAL_TYPES.RMN_SEAL
  )

  return (
    <View style={styles.panel}>
      <View style={styles.card}>
        <Text style={[TYPE.headingSm, styles.title]}>Verification status</Text>
        <View style={styles.badgeWrap}>
          <VerificationStatusBadge status={verificationStatus} />
        </View>
        <Text style={[TYPE.bodySm, styles.description]}>
          {STATUS_EXPLANATIONS[verificationStatus]}
        </Text>
        <View style={styles.profileAction}>
          <Button label="View my public profile" onPress={onOpenProfile} />
        </View>
      </View>

      <FarmerDetailsCard />

      <View style={styles.group}>
        <Text style={[TYPE.headingMd, styles.groupTitle]}>
          Official government registrations
        </Text>
        <RsbsaCard
          isLocked={isLocked}
          rsbsaNumber={rsbsaNumber}
          rsbsaDocumentPath={rsbsaDocumentPath}
          saveRsbsa={saveRsbsa}
          onSaved={notify}
        />
        <RmnSealCard
          isLocked={isLocked}
          seals={seals}
          removingId={removingId}
          addCredential={addCredential}
          removeCredential={removeCredential}
          onSaved={notify}
        />
      </View>

      <View style={styles.group}>
        <Text style={[TYPE.headingMd, styles.groupTitle]}>
          Certifications and accreditations
        </Text>
        <CredentialsCard
          isLocked={isLocked}
          credentials={certifications}
          removingId={removingId}
          addCredential={addCredential}
          removeCredential={removeCredential}
          onSaved={notify}
        />
      </View>

      <View style={styles.group}>
        <Text style={[TYPE.headingMd, styles.groupTitle]}>
          Local government and cooperative endorsements
        </Text>
        <EndorsementsCard
          isLocked={isLocked}
          endorsements={records.endorsements}
          removingId={removingId}
          addEndorsement={addEndorsement}
          removeEndorsement={removeEndorsement}
          onSaved={notify}
        />
        <AffiliationsCard
          isLocked={isLocked}
          affiliations={records.affiliations}
          removingId={removingId}
          addAffiliation={addAffiliation}
          removeAffiliation={removeAffiliation}
          onSaved={notify}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    gap: SPACING.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.ink,
  },
  badgeWrap: {
    marginTop: SPACING.md,
  },
  description: {
    color: COLORS.mute,
    marginTop: SPACING.md,
  },
  profileAction: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
  },
  group: {
    gap: SPACING.lg,
  },
  groupTitle: {
    color: COLORS.ink,
  },
  loading: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  errorCard: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.ink,
  },
  retryWrap: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
  },
})

export default FarmerProfilePanel
