import { useParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Icon from '../components/Icon'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import ReviewsCard from '../components/profile/ReviewsCard'
import VerificationStatusBadge from '../components/profile/VerificationStatusBadge'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import useFarmerProfile from '../hooks/useFarmerProfile'
import { formatDateOnly } from '../utils/format'
import { getInitials } from '../utils/userProfile'
import {
  CREDENTIAL_TYPE_LABELS,
  VERIFICATION_STATUSES,
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

function IdentityBand({ profile, avatarUrl, avatarError }: {
  profile: PublicFarmerProfile
  avatarUrl: string
  avatarError: string
}) {
  const location = locationLabel(profile)
  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6" aria-label="Farmer identity">
      <div className="flex items-center gap-4">
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

function VerifiedDetails({ credentials, affiliations, endorsements, detailsError }: {
  credentials: PublicCredential[]
  affiliations: PublicAffiliation[]
  endorsements: PublicEndorsement[]
  detailsError: string
}) {
  return (
    <div className="mt-4 space-y-5 border-t border-hairline pt-4">
      {detailsError ? (
        <p className="body-sm text-error" role="alert">
          {detailsError}
        </p>
      ) : null}

      <dl className="divide-y divide-hairline">
        {credentials.map((credential, index) => (
          <RecordRow
            key={`credential-${index}`}
            label="Credential"
            value={[
              CREDENTIAL_TYPE_LABELS[credential.credentialType],
              credential.issuingOrganization,
              credential.certificateNumber
                ? `Cert. no. ${credential.certificateNumber}`
                : '',
            ]
              .filter(Boolean)
              .join(' \u00b7 ')}
          />
        ))}
        {affiliations.map((affiliation, index) => (
          <RecordRow
            key={`affiliation-${index}`}
            label="FCA / Cooperative"
            value={[affiliation.organizationName, affiliation.membershipId]
              .filter(Boolean)
              .join(' \u00b7 ')}
          />
        ))}
        {endorsements.map((endorsement, index) => (
          <RecordRow
            key={`endorsement-${index}`}
            label="LGU / MAO endorsement"
            value={`${endorsement.issuingOffice}, ${endorsement.municipality} \u00b7 issued ${formatDateOnly(
              endorsement.dateIssued
            )}`}
          />
        ))}
      </dl>
    </div>
  )
}

function VerificationCard({
  profile,
  credentials,
  affiliations,
  endorsements,
  detailsError,
}: {
  profile: PublicFarmerProfile
  credentials: PublicCredential[]
  affiliations: PublicAffiliation[]
  endorsements: PublicEndorsement[]
  detailsError: string
}) {
  const isVerified = profile.verificationStatus === VERIFICATION_STATUSES.VERIFIED
  const hasVerifiedDetails =
    credentials.length > 0 || affiliations.length > 0 || endorsements.length > 0

  return (
    <section className="border border-hairline bg-canvas p-5 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="heading-sm text-ink">Verification</h2>
        <VerificationStatusBadge
          status={profile.verificationStatus}
          className="shrink-0"
        />
      </div>

      {profile.verificationStatus === VERIFICATION_STATUSES.PENDING ? (
        <p className="body-sm mt-3 text-mute">
          This farmer&apos;s documents are under review. The Verified Rice Farmer
          badge appears once the review is complete.
        </p>
      ) : null}

      {profile.verificationStatus === VERIFICATION_STATUSES.UNVERIFIED ? (
        <p className="body-sm mt-3 text-mute">
          This farmer has not submitted verification documents yet.
        </p>
      ) : null}

      {isVerified ? (
        <>
          {profile.rsbsaNumber ? (
            <dl className="mt-3 divide-y divide-hairline">
              <RecordRow label="RSBSA number" value={profile.rsbsaNumber} />
            </dl>
          ) : null}
          {hasVerifiedDetails || detailsError ? (
            <VerifiedDetails
              credentials={credentials}
              affiliations={affiliations}
              endorsements={endorsements}
              detailsError={detailsError}
            />
          ) : (
            <p className="body-sm mt-3 text-mute">
              No credential details are published on this profile.
            </p>
          )}
        </>
      ) : null}
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
            Sign in to view farmer profiles — their farm details, credentials, and
            the Verified Rice Farmer badge.
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
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-4">
          <IdentityBand profile={profile} avatarUrl={avatarUrl} avatarError={avatarError} />
          <FarmInformationCard profile={profile} />
          <VerificationCard
            profile={profile}
            credentials={credentials}
            affiliations={affiliations}
            endorsements={endorsements}
            detailsError={detailsError}
          />
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
