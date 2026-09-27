import type { FormEvent, ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import ProfileDetailsForm from '../components/profile/ProfileDetailsForm'
import ProfileIdentityCard from '../components/profile/ProfileIdentityCard'
import ProfileTabs from '../components/profile/ProfileTabs'
import PurchasesPanel from '../components/profile/PurchasesPanel'
import ReviewsCard from '../components/profile/ReviewsCard'
import SellingHistoryPanel from '../components/profile/SellingHistoryPanel'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import useProfile from '../hooks/useProfile'
import { PROFILE_TAB_IDS } from '../utils/profileTabs'
import type { ProfileTabId } from '../utils/profileTabs'
import { getDisplayName } from '../utils/userProfile'

const MEMBER_SINCE_DATE_OPTIONS: Intl.DateTimeFormatOptions = Object.freeze({
  year: 'numeric',
  month: 'long',
})

interface PageHeaderProps {
  title: string
  children?: ReactNode
}

function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="border-b border-hairline bg-canvas">
      <Container className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
        <div>
          <p className="caption-md text-primary">Profile</p>
          <h1 className="heading-xl mt-1 text-ink">{title}</h1>
        </div>
        {children}
      </Container>
    </div>
  )
}

interface SignedOutProfileProps {
  onSignIn: () => void
  onCreateAccount: () => void
}

function SignedOutProfile({ onSignIn, onCreateAccount }: SignedOutProfileProps) {
  return (
    <div className="border border-hairline bg-surface-soft p-8 md:p-10">
      <p className="body-md max-w-xl text-body">
        Sign in to set your photo, your name, and the contact number buyers
        use to reach you about a listing — and to keep a record of everything
        you post, sell, or remove. Your profile follows your account across
        the website and the mobile app.
      </p>
      <div className="mt-6 max-w-md">
        <Button onClick={onSignIn} className="w-full justify-center">
          Sign in
        </Button>
        <button
          type="button"
          onClick={onCreateAccount}
          className="body-strong mt-4 block w-full text-center text-link-blue transition-colors hover:text-primary"
        >
          New to PalaySigla? Create an account
        </button>
      </div>
    </div>
  )
}

function SignedOutPanel() {
  const { openAuthModal } = useAuth()
  return (
    <SignedOutProfile
      onSignIn={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
      onCreateAccount={() => openAuthModal(AUTH_MODAL_MODES.REGISTER)}
    />
  )
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="border border-hairline bg-canvas p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 shrink-0 animate-pulse rounded-full bg-surface-soft" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
            <div className="h-3 w-1/4 animate-pulse bg-surface-soft" />
            <div className="h-3 w-1/3 animate-pulse bg-surface-soft" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="border border-hairline bg-canvas p-5 md:p-6">
          <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div className="h-11 animate-pulse bg-surface-soft" />
            <div className="h-11 animate-pulse bg-surface-soft" />
          </div>
          <div className="mt-5 h-11 w-40 animate-pulse bg-surface-soft" />
        </div>
        <div className="border border-hairline bg-canvas p-5">
          <div className="h-4 w-1/2 animate-pulse bg-surface-soft" />
          <div className="mt-5 h-16 animate-pulse bg-surface-soft" />
        </div>
      </div>
    </div>
  )
}

interface LoadErrorStateProps {
  message: string
  onRetry: () => void
}

function LoadErrorState({ message, onRetry }: LoadErrorStateProps) {
  return (
    <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
      <p className="body-strong text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-11 border border-hairline bg-canvas px-4 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
      >
        Try again
      </button>
    </div>
  )
}

function SignedInAccount() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    fullName,
    phoneInput,
    errors,
    avatarUrl,
    hasAvatar,
    hasPendingFile,
    isRemovalStaged,
    fallbackInitials,
    avatarError,
    avatarUrlError,
    avatarBusy,
    isSaving,
    saveError,
    previewNote,
    canSave,
    isInitialLoading,
    loadError,
    retryLoad,
    isDirty,
    ratingAvg,
    ratingCount,
    onNameChange,
    onNameBlur,
    onPhoneChange,
    onPhoneBlur,
    onPickAvatarFile,
    onRequestRemoveAvatar,
    onCancelAvatarChange,
    saveProfile,
  } = useProfile()

  const email = user?.email ?? ''
  const displayName = getDisplayName(user)
  const memberSinceLabel = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(
        'en-PH',
        MEMBER_SINCE_DATE_OPTIONS
      )
    : ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const saved = await saveProfile()
    if (saved) {
      showToast('Profile updated.', TOAST_VARIANTS.SUCCESS)
    }
  }

  if (isInitialLoading) {
    return <LoadingState />
  }
  if (loadError) {
    return <LoadErrorState message={loadError} onRetry={retryLoad} />
  }

  return (
    <div className="space-y-4">
      <ProfileIdentityCard
        avatarUrl={avatarUrl}
        displayName={fullName || displayName}
        email={email}
        memberSinceLabel={memberSinceLabel}
        fallbackInitials={fallbackInitials}
        hasAvatar={hasAvatar}
        hasPendingFile={hasPendingFile}
        isRemovalStaged={isRemovalStaged}
        busy={avatarBusy}
        disabled={isSaving}
        error={avatarError}
        urlError={avatarUrlError}
        previewNote={previewNote}
        ratingAvg={ratingAvg}
        ratingCount={ratingCount}
        onPickFile={onPickAvatarFile}
        onRemove={onRequestRemoveAvatar}
        onCancel={onCancelAvatarChange}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <ProfileDetailsForm
          fullName={fullName}
          phone={phoneInput}
          errors={errors}
          isDirty={isDirty}
          canSave={canSave}
          isSaving={isSaving}
          saveError={saveError}
          onNameChange={onNameChange}
          onNameBlur={onNameBlur}
          onPhoneChange={onPhoneChange}
          onPhoneBlur={onPhoneBlur}
          onSubmit={handleSubmit}
        />
        <ReviewsCard ratingAvg={ratingAvg} ratingCount={ratingCount} />
      </div>
    </div>
  )
}

function SignedInProfile() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const activeTab: ProfileTabId =
    tabParam === PROFILE_TAB_IDS.LISTINGS
      ? PROFILE_TAB_IDS.LISTINGS
      : tabParam === PROFILE_TAB_IDS.PURCHASES
        ? PROFILE_TAB_IDS.PURCHASES
        : PROFILE_TAB_IDS.ACCOUNT

  return (
    <>
      <PageHeader title="Your profile.">
        <ProfileTabs activeTab={activeTab} />
      </PageHeader>
      <Container className="py-6 md:py-8">
        <div className="mx-auto max-w-4xl">
          {activeTab === PROFILE_TAB_IDS.LISTINGS ? (
            <SellingHistoryPanel />
          ) : activeTab === PROFILE_TAB_IDS.PURCHASES ? (
            <PurchasesPanel />
          ) : (
            <SignedInAccount />
          )}
        </div>
      </Container>
    </>
  )
}

function ProfilePage() {
  const { user, isInitializing } = useAuth()

  return (
    <>
      <PrimaryNav />
      <main>
        {isInitializing ? (
          <Container className="py-6 md:py-8">
            <div className="mx-auto max-w-4xl">
              <LoadingState />
            </div>
          </Container>
        ) : user ? (
          <SignedInProfile />
        ) : (
          <>
            <PageHeader title="Your profile." />
            <Container className="py-6 md:py-8">
              <div className="mx-auto max-w-4xl">
                <SignedOutPanel />
              </div>
            </Container>
          </>
        )}
      </main>
      <Footer />
    </>
  )
}

export default ProfilePage
