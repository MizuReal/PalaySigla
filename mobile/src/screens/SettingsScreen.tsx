// Settings tab — the signed-out state explains what one account unlocks and
// opens the auth dialog (Sign in / Create an account); the signed-in state is
// the profile surface: account summary plus a Selling history tab (All /
// Active / Sold / Deleted filters, owner actions through the listing detail).
// Session actions live in the tab bar's fifth action cell (Login signed-out /
// Logout signed-in, DESIGN.md chrome rule).
import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { User } from '@supabase/supabase-js'
import Button from '../components/Button'
import TabScreen from '../components/TabScreen'
import AvatarEditor from '../components/profile/AvatarEditor'
import ProfileDetailsForm from '../components/profile/ProfileDetailsForm'
import ReviewsCard from '../components/profile/ReviewsCard'
import SellingHistoryPanel from '../components/profile/SellingHistoryPanel'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import useProfile from '../hooks/useProfile'
import { getDisplayName } from '../utils/userProfile'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens'
import type { ListingWithImages } from '../types/domain'
import type { MainTabParamList, RootStackParamList } from '../types/navigation'

const ACCOUNT_BENEFITS = [
  'PalaySigla Assistant — chat history follows your account',
  'Scans, listings, and preferences all hang off one identity',
]

const PROFILE_TABS = Object.freeze({
  ACCOUNT: 'account',
  LISTINGS: 'listings',
} as const)

type ProfileTab = (typeof PROFILE_TABS)[keyof typeof PROFILE_TABS]

const PROFILE_TAB_OPTIONS: readonly { id: ProfileTab; label: string }[] =
  Object.freeze([
    { id: PROFILE_TABS.ACCOUNT, label: 'Account' },
    { id: PROFILE_TABS.LISTINGS, label: 'Selling history' },
  ])

interface ProfileTabsProps {
  activeTab: ProfileTab
  onSelect: (tab: ProfileTab) => void
}

function ProfileTabs({ activeTab, onSelect }: ProfileTabsProps) {
  return (
    <View style={styles.tabRow}>
      {PROFILE_TAB_OPTIONS.map((option) => {
        const isActive = option.id === activeTab
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => onSelect(option.id)}
            style={({ pressed }) => [
              styles.tab,
              isActive ? styles.tabActive : styles.tabInactive,
              pressed && !isActive && styles.tabPressed,
            ]}
          >
            <Text
              style={[
                TYPE.buttonSm,
                isActive ? styles.tabTextActive : styles.tabText,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

interface SignedOutAccountProps {
  onSignIn: () => void
  onCreateAccount: () => void
}

function SignedOutAccount({ onSignIn, onCreateAccount }: SignedOutAccountProps) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Account</Text>
      <Text style={[TYPE.displayLg, styles.title]}>Your account, your app.</Text>
      <Text style={[TYPE.bodyMd, styles.sub]}>
        Sign in to carry the same PalaySigla identity across the app and the
        website.
      </Text>
      <View style={styles.card}>
        <View style={styles.pointList}>
          {ACCOUNT_BENEFITS.map((benefit) => (
            <Text key={benefit} style={[TYPE.bodyMd, styles.point]}>
              {'\u2022'} {benefit}
            </Text>
          ))}
        </View>
      </View>
      <Button label="Sign in" onPress={onSignIn} fullWidth />
      <Pressable
        accessibilityRole="link"
        onPress={onCreateAccount}
        style={({ pressed }) => [styles.createLink, pressed && styles.pressedDim]}
      >
        <Text style={[TYPE.bodyStrong, styles.createLinkLabel]}>
          New to PalaySigla? Create an account
        </Text>
      </Pressable>
      <Text style={[TYPE.captionSm, styles.status]}>
        Post listings from the marketplace and manage them under Selling
        history.
      </Text>
    </View>
  )
}

interface SignedInProfileProps {
  user: User
  onSelectListing: (listing: ListingWithImages) => void
}

function SignedInProfile({ user, onSelectListing }: SignedInProfileProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(PROFILE_TABS.ACCOUNT)
  const profile = useProfile()
  const { showToast } = useToast()
  const memberSinceLabel = new Date(user.created_at).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
  })

  const handleSave = async () => {
    const saved = await profile.saveProfile()
    if (saved) {
      showToast('Profile updated.', TOAST_VARIANTS.SUCCESS)
    }
  }

  const renderAccount = () => {
    if (profile.isInitialLoading) {
      return (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )
    }
    if (profile.loadError) {
      return (
        <View style={styles.card}>
          <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.errorText]}>
            {profile.loadError}
          </Text>
          <View style={styles.retryWrap}>
            <Button label="Try again" onPress={profile.retryLoad} />
          </View>
        </View>
      )
    }
    return (
      <>
        <AvatarEditor
          avatarUrl={profile.displayAvatarUrl}
          fallbackInitials={profile.fallbackInitials}
          displayName={profile.fullName || getDisplayName(user)}
          email={user.email ?? ''}
          memberSinceLabel={memberSinceLabel}
          hasAvatar={profile.hasAvatar}
          hasPendingFile={profile.hasPendingFile}
          isRemovalStaged={profile.isRemovalStaged}
          busy={profile.avatarBusy || profile.isSaving}
          error={profile.avatarError}
          urlError={profile.avatarUrlError}
          previewNote={profile.previewNote}
          onPickFile={profile.pickAvatar}
          onRemove={profile.onRequestRemoveAvatar}
          onCancel={profile.onCancelAvatarChange}
        />
        <ProfileDetailsForm
          fullName={profile.fullName}
          phoneInput={profile.phoneInput}
          errors={profile.errors}
          isSaving={profile.isSaving}
          canSave={profile.canSave}
          isDirty={profile.isDirty}
          saveError={profile.saveError}
          onNameChange={profile.onNameChange}
          onPhoneChange={profile.onPhoneChange}
          onNameBlur={profile.onNameBlur}
          onPhoneBlur={profile.onPhoneBlur}
          onSave={handleSave}
        />
        <ReviewsCard
          ratingAvg={profile.ratingAvg}
          ratingCount={profile.ratingCount}
        />
      </>
    )
  }

  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Account</Text>
      <Text style={[TYPE.displayLg, styles.title]} numberOfLines={2}>
        {getDisplayName(user)}
      </Text>
      <ProfileTabs activeTab={activeTab} onSelect={setActiveTab} />
      {activeTab === PROFILE_TABS.ACCOUNT ? (
        renderAccount()
      ) : (
        <SellingHistoryPanel onSelectListing={onSelectListing} />
      )}
    </View>
  )
}

type SettingsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Settings'>,
  NativeStackScreenProps<RootStackParamList>
>

function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { user, openAuthModal } = useAuth()

  if (user) {
    return (
      <TabScreen>
        <SignedInProfile
          user={user}
          onSelectListing={(listing) =>
            navigation.navigate('ListingDetail', { listingId: listing.id })
          }
        />
      </TabScreen>
    )
  }

  return (
    <TabScreen>
      <SignedOutAccount
        onSignIn={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
        onCreateAccount={() => openAuthModal(AUTH_MODAL_MODES.REGISTER)}
      />
    </TabScreen>
  )
}

const styles = StyleSheet.create({
  panel: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxl + SPACING.lg,
    alignSelf: 'stretch',
    gap: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.mute,
  },
  title: {
    color: COLORS.ink,
  },
  sub: {
    color: COLORS.body,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  pointList: {
    gap: SPACING.md,
  },
  point: {
    color: COLORS.body,
  },
  createLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createLinkLabel: {
    color: COLORS.linkBlue,
  },
  pressedDim: {
    opacity: 0.6,
  },
  status: {
    color: COLORS.mute,
  },
  loadingBlock: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.ink,
  },
  retryWrap: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  tabInactive: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  tabActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  tabPressed: {
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.ink,
  },
  tabTextActive: {
    color: COLORS.onDark,
  },
})

export default SettingsScreen
