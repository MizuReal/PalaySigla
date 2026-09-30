// Public farmer profile wall — the mobile port of /farmers/:userId. Signed-in
// viewers see the identity band, farm information, verification badge and
// credential metadata, and the farmer's public reviews.
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
import ReviewsCard from '../components/profile/ReviewsCard'
import VerificationStatusBadge from '../components/profile/VerificationStatusBadge'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import useFarmerProfile from '../hooks/useFarmerProfile'
import { formatDateOnly } from '../utils/format'
import { CREDENTIAL_TYPE_LABELS, VERIFICATION_STATUSES } from '../utils/verification'
import type {
  PublicAffiliation,
  PublicCredential,
  PublicEndorsement,
  PublicFarmerProfile,
} from '../services/farmerProfile'
import type { RootStackParamList } from '../types/navigation'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'

const MEMBER_SINCE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
}

function locationLabel(profile: PublicFarmerProfile): string {
  return [profile.barangay, profile.municipality, profile.province]
    .filter((part) => part.trim().length > 0)
    .join(', ')
}

function RecordRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordRow}>
      <Text style={[TYPE.captionSm, styles.recordLabel]}>{label}</Text>
      <Text style={[TYPE.bodySm, styles.recordValue]}>{value}</Text>
    </View>
  )
}

function FarmCard({ profile }: { profile: PublicFarmerProfile }) {
  const hasDetails =
    profile.farmSizeHectares !== null ||
    profile.yearsFarmingExperience !== null ||
    profile.riceVarieties.length > 0

  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.cardTitle]}>Farming information</Text>
      {hasDetails ? (
        <View style={styles.recordList}>
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
            <View style={styles.recordRowStacked}>
              <Text style={[TYPE.captionSm, styles.recordLabel]}>
                Rice varieties grown
              </Text>
              <View style={styles.varietyWrap}>
                {profile.riceVarieties.map((variety) => (
                  <View key={variety} style={styles.varietyChip}>
                    <Text style={[TYPE.captionSm, styles.varietyLabel]}>{variety}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          This farmer has not added farming details yet.
        </Text>
      )}
    </View>
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
  const hasDetails =
    credentials.length > 0 || affiliations.length > 0 || endorsements.length > 0

  return (
    <View style={styles.card}>
      <View style={styles.verificationHeader}>
        <Text style={[TYPE.headingSm, styles.cardTitle]}>Verification</Text>
        <VerificationStatusBadge status={profile.verificationStatus} />
      </View>

      {profile.verificationStatus === VERIFICATION_STATUSES.PENDING ? (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          This farmer&apos;s documents are under review. The Verified Rice Farmer
          badge appears once the review is complete.
        </Text>
      ) : null}

      {profile.verificationStatus === VERIFICATION_STATUSES.UNVERIFIED ? (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          This farmer has not submitted verification documents yet.
        </Text>
      ) : null}

      {isVerified ? (
        <>
          {profile.rsbsaNumber ? (
            <View style={styles.recordList}>
              <RecordRow label="RSBSA number" value={profile.rsbsaNumber} />
            </View>
          ) : null}
          {detailsError ? (
            <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.errorText]}>
              {detailsError}
            </Text>
          ) : null}
          {hasDetails ? (
            <View style={styles.recordList}>
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
            </View>
          ) : detailsError ? null : (
            <Text style={[TYPE.bodySm, styles.mutedCopy]}>
              No credential details are published on this profile.
            </Text>
          )}
        </>
      ) : null}
    </View>
  )
}

type FarmerProfileScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'FarmerProfile'
>

function FarmerProfileScreen({ route, navigation }: FarmerProfileScreenProps) {
  const { userId } = route.params
  const insets = useSafeAreaInsets()
  const { user, openAuthModal } = useAuth()
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
  } = useFarmerProfile(user ? userId : null)

  const renderBody = () => {
    if (!user) {
      return (
        <View style={styles.centered}>
          <Text style={[TYPE.bodyMd, styles.centeredCopy]}>
            Sign in to view farmer profiles — their farm details, credentials, and
            the Verified Rice Farmer badge.
          </Text>
          <View style={styles.centeredAction}>
            <Button
              label="Sign in"
              onPress={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
            />
          </View>
        </View>
      )
    }
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )
    }
    if (error) {
      return (
        <View style={styles.centered}>
          <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.centeredTitle]}>
            {error}
          </Text>
          <View style={styles.centeredAction}>
            <Button label="Try again" onPress={retry} />
          </View>
        </View>
      )
    }
    if (!profile) {
      return (
        <View style={styles.centered}>
          <Text style={[TYPE.bodyStrong, styles.centeredTitle]}>
            Farmer profile not found.
          </Text>
          <Text style={[TYPE.bodySm, styles.centeredCopy]}>
            This account may have been removed, or the link is incorrect.
          </Text>
        </View>
      )
    }
    const location = locationLabel(profile)
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.identityRow}>
            <Photo
              uri={avatarUrl}
              alt={`${profile.fullName || 'Farmer'} profile photo`}
              fallbackLabel={profile.fullName || 'Farmer'}
              style={styles.avatar}
            />
            <View style={styles.identityBody}>
              <Text style={[TYPE.headingSm, styles.identityName]}>
                {profile.fullName || 'Farmer'}
              </Text>
              {location ? (
                <View style={styles.locationRow}>
                  <Icon name="pin" size={14} color={COLORS.mute} />
                  <Text style={[TYPE.captionSm, styles.identityMeta]}>{location}</Text>
                </View>
              ) : null}
              <Text style={[TYPE.captionSm, styles.identityMeta]}>
                Member since{' '}
                {new Date(profile.memberSince).toLocaleDateString(
                  'en-PH',
                  MEMBER_SINCE_OPTIONS
                )}
              </Text>
            </View>
          </View>
          {avatarError ? (
            <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.errorText]}>
              {avatarError}
            </Text>
          ) : null}
        </View>

        <FarmCard profile={profile} />
        <VerificationCard
          profile={profile}
          credentials={credentials}
          affiliations={affiliations}
          endorsements={endorsements}
          detailsError={detailsError}
        />

        {profile.id === user.id ? (
          <View style={styles.ownerCard}>
            <Text style={[TYPE.bodySm, styles.ownerCopy]}>
              This is your public profile wall.
            </Text>
            <View style={styles.ownerAction}>
              <Button
                label="Manage your farmer profile"
                onPress={() =>
                  navigation.navigate('Main', {
                    screen: 'Settings',
                    params: { tab: 'farmer' },
                  })
                }
              />
            </View>
          </View>
        ) : null}

        <ReviewsCard
          userId={profile.id}
          ratingAvg={profile.ratingAvg}
          ratingCount={profile.ratingCount}
        />
      </ScrollView>
    )
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.backButton, pressed && styles.dim]}
          >
            <Icon name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[TYPE.captionMd, styles.topBarLabel]}>Farmer profile</Text>
        </View>
      </View>
      {renderBody()}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLabel: {
    color: COLORS.mute,
  },
  dim: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.lg,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  cardTitle: {
    color: COLORS.ink,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
  },
  identityBody: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xxs,
  },
  identityName: {
    color: COLORS.ink,
  },
  identityMeta: {
    color: COLORS.mute,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recordList: {
    marginTop: SPACING.md,
  },
  recordRow: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  recordRowStacked: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
  recordLabel: {
    color: COLORS.mute,
  },
  recordValue: {
    color: COLORS.ink,
    marginTop: SPACING.xxs,
  },
  varietyWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  varietyChip: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  varietyLabel: {
    color: COLORS.ink,
  },
  verificationHeader: {
    gap: SPACING.md,
  },
  mutedCopy: {
    color: COLORS.mute,
    marginTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  ownerCard: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  ownerCopy: {
    color: COLORS.body,
  },
  ownerAction: {
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: GUTTER,
    gap: SPACING.md,
  },
  centeredTitle: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  centeredCopy: {
    color: COLORS.body,
    textAlign: 'center',
  },
  centeredAction: {
    marginTop: SPACING.sm,
  },
})

export default FarmerProfileScreen
