import Button from '../Button'
import AffiliationSection from './AffiliationSection'
import CredentialsSection from './CredentialsSection'
import EndorsementSection from './EndorsementSection'
import RsbsaSection from './RsbsaSection'
import SupportingDocumentsSection from './SupportingDocumentsSection'
import VerificationStatusBadge from './VerificationStatusBadge'
import { useAuth } from '../../context/authContext'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import useVerificationRecords from '../../hooks/useVerificationRecords'
import { VERIFICATION_STATUSES } from '../../utils/verification'
import type { VerificationStatus } from '../../utils/verification'

const STATUS_EXPLANATIONS: Record<VerificationStatus, string> = {
  [VERIFICATION_STATUSES.UNVERIFIED]:
    'Add at least one credential or supporting document to start the verification process.',
  [VERIFICATION_STATUSES.PENDING]:
    'Your documents are in. Our team reviews every submission before granting the Verified Rice Farmer badge.',
  [VERIFICATION_STATUSES.VERIFIED]:
    'Your documents were reviewed and approved. The badge appears on your profile wall.',
}

function FarmerVerificationPanel() {
  const { user } = useAuth()
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
      <div className="space-y-4">
        {[0, 1, 2].map((key) => (
          <div key={key} className="border border-hairline bg-canvas p-5 md:p-6">
            <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
            <div className="mt-5 h-11 animate-pulse bg-surface-soft" />
          </div>
        ))}
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
        <p className="body-strong text-ink">{loadError}</p>
        <button
          type="button"
          onClick={retryLoad}
          className="mt-4 h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="border border-hairline bg-canvas p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="heading-sm text-ink">Verification status</h2>
            <p className="body-sm mt-1 max-w-2xl text-mute">
              {STATUS_EXPLANATIONS[verificationStatus]}
            </p>
          </div>
          <VerificationStatusBadge status={verificationStatus} className="shrink-0" />
        </div>
        {user ? (
          <div className="mt-5 border-t border-hairline pt-4">
            <Button
              variant="outline"
              to={`/farmers/${user.id}`}
              className="w-full justify-center sm:w-auto"
            >
              View my public profile
            </Button>
          </div>
        ) : null}
      </section>

      <RsbsaSection
        isLocked={isLocked}
        rsbsaNumber={rsbsaNumber}
        rsbsaDocumentPath={rsbsaDocumentPath}
        saveRsbsa={saveRsbsa}
        onSaved={notify}
      />

      <CredentialsSection
        isLocked={isLocked}
        credentials={records.credentials}
        removingId={removingId}
        addCredential={addCredential}
        removeCredential={removeCredential}
        onSaved={notify}
      />

      <AffiliationSection
        isLocked={isLocked}
        affiliations={records.affiliations}
        removingId={removingId}
        addAffiliation={addAffiliation}
        removeAffiliation={removeAffiliation}
        onSaved={notify}
      />

      <EndorsementSection
        isLocked={isLocked}
        endorsements={records.endorsements}
        removingId={removingId}
        addEndorsement={addEndorsement}
        removeEndorsement={removeEndorsement}
        onSaved={notify}
      />

      <SupportingDocumentsSection
        isLocked={isLocked}
        documents={records.documents}
        removingId={removingId}
        addSupportingDocument={addSupportingDocument}
        removeSupportingDocument={removeSupportingDocument}
        onSaved={notify}
      />
    </div>
  )
}

export default FarmerVerificationPanel
