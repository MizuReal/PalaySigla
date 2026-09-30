import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Icon from '../components/Icon'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import CertificateThumbnail from '../components/profile/CertificateThumbnail'
import ReviewsCard from '../components/profile/ReviewsCard'
import VerificationStatusBadge from '../components/profile/VerificationStatusBadge'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import useFarmerProfile from '../hooks/useFarmerProfile'
import { formatDateOnly } from '../utils/format'
import { getInitials } from '../utils/userProfile'
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_LABELS,
  ENDORSEMENT_TYPE_LABELS,
  RMN_ORGANIZATION_NAME,
} from '../utils/verification'
import type {
  PublicAffiliation,
  PublicCredential,
  PublicEndorsement,
  PublicFarmerProfile,
} from '../services/farmerProfile'

const MEMBER_SINCE_DATE_OPTIONS: Intl.DateTimeFormatOptions = Object.freeze({
  year: 'numeric',
  month: 'long',
})

function locationLabel(profile: PublicFarmerProfile): string {
  return [profile.barangay, profile.municipality, profile.province]
    .filter((part) => part.trim().length > 0)
    .join(', ')
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="caption-sm w-44 shrink-0 text-mute">{label}</dt>
      <dd className="body-sm break-words text-ink">{value}</dd>
    </div>
  )
}

function IdentityBand({
  profile,
  avatarUrl,
  avatarError,
}: {
  profile: PublicFarmerProfile
  avatarUrl: string
  avatarError: string
}) {
  const location = locationLabel(profile)
  return (
    <section
      className="border border-hairline bg-canvas p-5 md:p-6"
      aria-label="Farmer identity"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${profile.fullName || 'Farmer'} profile photo`}
              className="h-20 w-20 shrink-0 rounded-full border border-hairline object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface-soft"
            >
              <span className="heading-md text-ink">{getInitials(profile.fullName)}</span>
            </span>
          )}
          <div className="min-w-0">
            <p className="heading-sm truncate text-ink">
              {profile.fullName || 'Farmer'}
            </p>
            {location ? (
              <p className="caption-sm mt-1 flex items-center gap-1.5 text-mute">
                <Icon name="pin" className="h-3.5 w-3.5 shrink-0" />
                {location}
              </p>
            ) : null}
            <p className="caption-sm mt-0.5 text-mute">
              Member since{' '}
              {new Date(profile.memberSince).toLocaleDateString(
                'en-PH',
                MEMBER_SINCE_DATE_OPTIONS
              )}
            </p>
          </div>
        </div>
        <VerificationStatusBadge
          status={profile.verificationStatus}
          className="shrink-0"
        />
      </div>
      {avatarError ? (
        <p className="caption-sm mt-3 text-error" role="alert">
          {avatarError}
        </p>
      ) : null}
    </section>
  )
}

function FarmInformationCard({ profile }: { profile: PublicFarmerProfile }) {
  const hasDetails =
    profile.farmSizeHectares !== null ||
    profile.yearsFarmingExperience !== null ||
    profile.riceVarieties.length > 0

  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">Farming information</h2>
      {hasDetails ? (
        <dl className="mt-3 divide-y divide-hairline">
          {profile.farmSizeHectares !== null ? (
            <RecordRow
              label="Farm size"
              value={`${profile.farmSizeHectares} hectare${
                profile.farmSizeHectares === 1 ? '' : 's'
              }`}
            />
          ) : null}
          {profile.yearsFarmingExperience !== null ? (
            <RecordRow
              label="Farming experience"
              value={`${profile.yearsFarmingExperience} year${
                profile.yearsFarmingExperience === 1 ? '' : 's'
              }`}
            />
          ) : null}
          {profile.riceVarieties.length > 0 ? (
            <div className="flex flex-col gap-2 py-3 sm:flex-row sm:gap-4">
              <dt className="caption-sm w-44 shrink-0 text-mute">
                Rice varieties grown
              </dt>
              <dd className="flex flex-wrap gap-2">
                {profile.riceVarieties.map((variety) => (
                  <span
                    key={variety}
                    className="inline-flex items-center rounded-sm border border-hairline bg-surface-soft px-2.5 py-1 caption-sm text-ink"
                  >
                    {variety}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="body-sm mt-3 text-mute">
          This farmer has not added farming details yet.
        </p>
      )}
    </section>
  )
}

function RegistrationsCard({
  profile,
  seals,
}: {
  profile: PublicFarmerProfile
  seals: PublicCredential[]
}) {
  const hasRegistrations = Boolean(profile.rsbsaDocumentPath) || seals.length > 0
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">Official government registrations</h2>
      {hasRegistrations ? (
        <ul className="mt-3 divide-y divide-hairline">
          {profile.rsbsaDocumentPath ? (
            <li className="flex items-center gap-3 py-3">
              <CertificateThumbnail
                storagePath={profile.rsbsaDocumentPath}
                title="RSBSA registration stub"
              />
              <div className="min-w-0">
                <p className="body-strong text-ink">RSBSA Control Number Stub</p>
                <p className="caption-sm text-mute">
                  Public copy — the control number is hidden on the stub.
                </p>
              </div>
            </li>
          ) : null}
          {seals.map((seal) => (
            <li key={seal.id} className="flex items-center gap-3 py-3">
              <CertificateThumbnail
                storagePath={seal.documentPath}
                title="RMN seal"
              />
              <div className="min-w-0">
                <p className="body-strong text-ink">
                  Rice Farmers&apos; National Network (RMN) Seal
                </p>
                <p className="caption-sm text-mute">{RMN_ORGANIZATION_NAME}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="body-sm mt-3 text-mute">
          No official registrations published yet.
        </p>
      )}
    </section>
  )
}

function CertificationsCard({ credentials }: { credentials: PublicCredential[] }) {
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">Certifications and accreditations</h2>
      {credentials.length > 0 ? (
        <ul className="mt-3 divide-y divide-hairline">
          {credentials.map((credential) => (
            <li key={credential.id} className="flex items-start gap-3 py-3">
              <CertificateThumbnail
                storagePath={credential.documentPath}
                title={CREDENTIAL_TYPE_LABELS[credential.credentialType]}
              />
              <div className="min-w-0">
                <p className="body-strong text-ink">
                  {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
                </p>
                <p className="body-sm text-body">{credential.issuingOrganization}</p>
                {credential.certificateNumber ? (
                  <p className="caption-sm text-mute">
                    Certificate no. {credential.certificateNumber}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="body-sm mt-3 text-mute">
          No certifications published yet.
        </p>
      )}
    </section>
  )
}

function EndorsementsCard({
  endorsements,
  affiliations,
}: {
  endorsements: PublicEndorsement[]
  affiliations: PublicAffiliation[]
}) {
  const hasEndorsements = endorsements.length > 0 || affiliations.length > 0
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <h2 className="heading-sm text-ink">
        Local government and cooperative endorsements
      </h2>
      {hasEndorsements ? (
        <ul className="mt-3 divide-y divide-hairline">
          {endorsements.map((endorsement) => (
            <li key={endorsement.id} className="flex items-start gap-3 py-3">
              <CertificateThumbnail
                storagePath={endorsement.documentPath}
                title={ENDORSEMENT_TYPE_LABELS[endorsement.endorsementType]}
              />
              <div className="min-w-0">
                <p className="body-strong text-ink">
                  {ENDORSEMENT_TYPE_LABELS[endorsement.endorsementType]}
                </p>
                <p className="body-sm text-body">{endorsement.issuingOffice}</p>
                <p className="body-sm text-body">{endorsement.municipality}</p>
                <p className="caption-sm text-mute">
                  Issued {formatDateOnly(endorsement.dateIssued)}
                </p>
              </div>
            </li>
          ))}
          {affiliations.map((affiliation) => (
            <li key={affiliation.id} className="flex items-start gap-3 py-3">
              <CertificateThumbnail
                storagePath={affiliation.proofPath}
                title={`${affiliation.organizationName} proof of affiliation`}
              />
              <div className="min-w-0">
                <p className="body-strong text-ink">{affiliation.organizationName}</p>
                <p className="caption-sm text-mute">
                  FCA / Farmers&apos; Association / Cooperative membership
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="body-sm mt-3 text-mute">
          No endorsements published yet.
        </p>
      )}
    </section>
  )
}

function LoadingWall() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="space-y-4">
        <div className="border border-hairline bg-canvas p-5 md:p-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-surface-soft" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
              <div className="h-3 w-1/4 animate-pulse bg-surface-soft" />
            </div>
          </div>
        </div>
        <div className="h-40 animate-pulse border border-hairline bg-surface-soft" />
      </div>
      <div className="h-64 animate-pulse border border-hairline bg-surface-soft" />
    </div>
  )
}

function FarmerProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { user, isInitializing, openAuthModal } = useAuth()
  const {
    profile,
    avatarUrl,
    avatarError,
    credentials,
    affiliations,
    endorsements,
    detailsError,
    isLoading,
    error,
    retry,
  } = useFarmerProfile(user && userId ? userId : null)

  const renderContent = () => {
    if (isInitializing) {
      return <LoadingWall />
    }
    if (!user) {
      return (
        <div className="border border-hairline bg-surface-soft p-8 md:p-10">
          <p className="body-md max-w-xl text-body">
            Sign in to view farmer profiles — their registrations, certifications,
            endorsements, and the Verified Rice Farmer badge.
          </p>
          <div className="mt-6 max-w-md">
            <Button
              onClick={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
              className="w-full justify-center"
            >
              Sign in
            </Button>
          </div>
        </div>
      )
    }
    if (isLoading) {
      return <LoadingWall />
    }
    if (error) {
      return (
        <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
          <p className="body-strong text-ink">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    if (!profile) {
      return (
        <div className="border border-hairline bg-surface-soft p-8 text-center">
          <p className="body-strong text-ink">Farmer profile not found.</p>
          <p className="body-sm mt-2 text-mute">
            This account may have been removed, or the link is incorrect.
          </p>
        </div>
      )
    }

    const seals = credentials.filter(
      (credential) => credential.credentialType === CREDENTIAL_TYPES.RMN_SEAL
    )
    const certifications = credentials.filter(
      (credential) => credential.credentialType !== CREDENTIAL_TYPES.RMN_SEAL
    )

    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-4">
          <IdentityBand
            profile={profile}
            avatarUrl={avatarUrl}
            avatarError={avatarError}
          />
          <FarmInformationCard profile={profile} />
          <RegistrationsCard profile={profile} seals={seals} />
          <CertificationsCard credentials={certifications} />
          <EndorsementsCard
            endorsements={endorsements}
            affiliations={affiliations}
          />
          {detailsError ? (
            <p className="body-sm text-error" role="alert">
              {detailsError}
            </p>
          ) : null}
          {profile.id === user.id ? (
            <div className="border border-hairline bg-surface-soft p-4">
              <p className="body-sm text-body">This is your public profile wall.</p>
              <Button
                variant="outline"
                to={`/profile?tab=farmer`}
                className="mt-3 w-full justify-center sm:w-auto"
              >
                Edit your farmer profile
              </Button>
            </div>
          ) : null}
        </div>
        <ReviewsCard
          userId={profile.id}
          ratingAvg={profile.ratingAvg}
          ratingCount={profile.ratingCount}
        />
      </div>
    )
  }

  return (
    <>
      <PrimaryNav />
      <main>
        <div className="border-b border-hairline bg-canvas">
          <Container className="py-6 md:py-8">
            <p className="caption-md text-primary">Farmer profile</p>
            <h1 className="heading-xl mt-1 text-ink">
              {profile?.fullName || 'Farmer profile'}
            </h1>
          </Container>
        </div>
        <Container className="py-6 md:py-8">
          <div className="mx-auto max-w-5xl">{renderContent()}</div>
        </Container>
      </main>
      <Footer />
    </>
  )
}

export default FarmerProfilePage
