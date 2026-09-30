// Farmer profile management panel — the Settings "Farmer profile" tab. Owns
// the verification-record hook and composes the farm details card, the status
// card, and the five record sections.
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import Button from '../Button'
import FarmerDetailsCard from './FarmerDetailsCard'
import VerificationStatusBadge from './VerificationStatusBadge'
import {
  AffiliationsCard,
  CredentialsCard,
  EndorsementsCard,
  RsbsaCard,
  SupportingDocumentsCard,
} from './VerificationSections'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import useVerificationRecords from '../../hooks/useVerificationRecords'
import { VERIFICATION_STATUSES } from '../../utils/verification'
import type { VerificationStatus } from '../../utils/verification'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'

const STATUS_EXPLANATIONS: Record<VerificationStatus, string> = {
  [VERIFICATION_STATUSES.UNVERIFIED]:
    'Add at least one credential or supporting document to start the verification process.',
  [VERIFICATION_STATUSES.PENDING]:
    'Your documents are in. Our team reviews every submission before granting the Verified Rice Farmer badge.',
  [VERIFICATION_STATUSES.VERIFIED]:
    'Your documents were reviewed and approved. The badge appears on your profile wall.',
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
    addSupportingDocument,
    removeSupportingDocument,
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

      <RsbsaCard
        isLocked={isLocked}
        rsbsaNumber={rsbsaNumber}
        rsbsaDocumentPath={rsbsaDocumentPath}
        saveRsbsa={saveRsbsa}
        onSaved={notify}
      />

      <CredentialsCard
        isLocked={isLocked}
        credentials={records.credentials}
        removingId={removingId}
        addCredential={addCredential}
        removeCredential={removeCredential}
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

      <EndorsementsCard
        isLocked={isLocked}
        endorsements={records.endorsements}
        removingId={removingId}
        addEndorsement={addEndorsement}
        removeEndorsement={removeEndorsement}
        onSaved={notify}
      />

      <SupportingDocumentsCard
        isLocked={isLocked}
        documents={records.documents}
        removingId={removingId}
        addSupportingDocument={addSupportingDocument}
        removeSupportingDocument={removeSupportingDocument}
        onSaved={notify}
      />
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
