import Button from '../components/Button.jsx'
import Container from '../components/Container.jsx'
import Footer from '../components/site/Footer.jsx'
import PrimaryNav from '../components/site/PrimaryNav.jsx'
import AvatarEditor from '../components/profile/AvatarEditor.jsx'
import ProfileDetailsForm from '../components/profile/ProfileDetailsForm.jsx'
import ReviewsCard from '../components/profile/ReviewsCard.jsx'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext.js'
import { TOAST_VARIANTS, useToast } from '../context/toastContext.js'
import useProfile from '../hooks/useProfile.js'
import { getDisplayName } from '../utils/userProfile.js'

const MEMBER_SINCE_DATE_OPTIONS = Object.freeze({
  year: 'numeric',
  month: 'long',
})

function PageHeader({ eyebrow, title, lead }) {
  return (
    <div className="border-b border-hairline bg-canvas">
      <Container className="py-10 md:py-16">
        <p className="caption-md text-primary">{eyebrow}</p>
        <h1 className="heading-xl mt-3 text-ink">{title}</h1>
        <p className="body-md mt-4 max-w-2xl text-body">{lead}</p>
      </Container>
    </div>
  )
}

function SignedOutProfile({ onSignIn, onCreateAccount }) {
  return (
    <div className="border border-hairline bg-surface-soft p-8 md:p-12">
      <p className="body-md max-w-xl text-body">
        Sign in to set your photo, your name, and the contact number buyers
        use to reach you about a listing. Your profile follows your account
        across the website and the mobile app.
      </p>
      <div className="mt-8 max-w-md">
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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex flex-col gap-4 lg:order-2 lg:w-[340px] lg:shrink-0">
        <div className="border border-hairline bg-canvas p-6">
          <div className="mx-auto h-24 w-24 animate-pulse rounded-full bg-surface-soft md:h-28 md:w-28" />
          <div className="mx-auto mt-4 h-4 w-2/3 animate-pulse bg-surface-soft" />
          <div className="mx-auto mt-2 h-3 w-1/2 animate-pulse bg-surface-soft" />
        </div>
        <div className="border border-hairline bg-canvas p-6">
          <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
          <div className="mt-5 h-4 w-2/3 animate-pulse bg-surface-soft" />
          <div className="mt-3 h-3 w-1/2 animate-pulse bg-surface-soft" />
        </div>
      </div>
      <div className="min-w-0 flex-1 lg:order-1">
        <div className="border border-hairline bg-canvas p-6 md:p-8">
          <div className="h-4 w-1/3 animate-pulse bg-surface-soft" />
          <div className="mt-6 h-11 animate-pulse bg-surface-soft" />
          <div className="mt-6 h-11 animate-pulse bg-surface-soft" />
          <div className="mt-6 h-11 w-40 animate-pulse bg-surface-soft" />
        </div>
      </div>
    </div>
  )
}

function LoadErrorState({ message, onRetry }) {
  return (
    <div className="border border-error bg-surface-soft p-8 text-center" role="alert">
      <p className="body-strong text-ink">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
      >
        Try again
      </button>
    </div>
  )
}

function SignedInProfile() {
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    const saved = await saveProfile()
    if (saved) {
      showToast('Profile updated.', TOAST_VARIANTS.SUCCESS)
    }
  }

  const renderBody = () => {
    if (isInitialLoading) {
      return <LoadingState />
    }
    if (loadError) {
      return <LoadErrorState message={loadError} onRetry={retryLoad} />
    }
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-4 lg:order-2 lg:w-[340px] lg:shrink-0">
          <AvatarEditor
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
            onPickFile={onPickAvatarFile}
            onRemove={onRequestRemoveAvatar}
            onCancel={onCancelAvatarChange}
          />
          <ReviewsCard ratingAvg={ratingAvg} ratingCount={ratingCount} />
        </div>
        <div className="min-w-0 flex-1 lg:order-1">
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
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="Your profile."
        lead="Your photo, name, and contact number — the details buyers see when they reach you about a listing."
      />
      <Container className="py-10 md:py-[64px]">
        <div className="mx-auto max-w-4xl">{renderBody()}</div>
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
          <Container className="py-10 md:py-[64px]">
            <div className="mx-auto max-w-4xl">
              <LoadingState />
            </div>
          </Container>
        ) : user ? (
          <SignedInProfile />
        ) : (
          <>
            <PageHeader
              eyebrow="Profile"
              title="Your profile."
              lead="The place to manage who you are on PalaySigla."
            />
            <Container className="py-10 md:py-[64px]">
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
