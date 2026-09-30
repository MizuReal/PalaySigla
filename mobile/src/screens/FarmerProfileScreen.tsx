// Public farmer profile wall — the mobile port of /farmers/:userId. Signed-in
// viewers see the identity band, farming information, public registrations,
// certifications, endorsements, and the farmer's public reviews. The Verified
// badge is an independent trust signal; content is not gated on it.
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
import CertificateThumbnail from '../components/profile/CertificateThumbnail'
import Icon from '../components/Icon'
import Photo from '../components/Photo'
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
        <View>
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

function RegistrationsCard({
  profile,
  seals,
}: {
  profile: PublicFarmerProfile
  seals: PublicCredential[]
}) {
  const hasRegistrations = Boolean(profile.rsbsaDocumentPath) || seals.length > 0
  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.cardTitle]}>
        Official government registrations
      </Text>
      {hasRegistrations ? (
        <View>
          {profile.rsbsaDocumentPath ? (
            <View style={styles.publicRow}>
              <CertificateThumbnail
                storagePath={profile.rsbsaDocumentPath}
                title="RSBSA registration stub"
              />
              <View style={styles.publicRowBody}>
                <Text style={[TYPE.bodyStrong, styles.publicRowTitle]}>
                  RSBSA Control Number Stub
                </Text>
                <Text style={[TYPE.captionSm, styles.publicRowCaption]}>
                  Public copy — the control number is hidden on the stub.
                </Text>
              </View>
            </View>
          ) : null}
          {seals.map((seal) => (
            <View key={seal.id} style={styles.publicRow}>
              <CertificateThumbnail storagePath={seal.documentPath} title="RMN seal" />
              <View style={styles.publicRowBody}>
                <Text style={[TYPE.bodyStrong, styles.publicRowTitle]}>
                  Rice Farmers&apos; National Network (RMN) Seal
                </Text>
                <Text style={[TYPE.captionSm, styles.publicRowCaption]}>
                  {RMN_ORGANIZATION_NAME}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          No official registrations published yet.
        </Text>
      )}
    </View>
  )
}

function CertificationsCard({ credentials }: { credentials: PublicCredential[] }) {
  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.cardTitle]}>
        Certifications and accreditations
      </Text>
      {credentials.length > 0 ? (
        <View>
          {credentials.map((credential) => (
            <View key={credential.id} style={styles.publicRow}>
              <CertificateThumbnail
                storagePath={credential.documentPath}
                title={CREDENTIAL_TYPE_LABELS[credential.credentialType]}
              />
              <View style={styles.publicRowBody}>
                <Text style={[TYPE.bodyStrong, styles.publicRowTitle]}>
                  {CREDENTIAL_TYPE_LABELS[credential.credentialType]}
                </Text>
                <Text style={[TYPE.bodySm, styles.publicRowSub]}>
                  {credential.issuingOrganization}
                </Text>
                {credential.certificateNumber ? (
                  <Text style={[TYPE.captionSm, styles.publicRowCaption]}>
                    Certificate no. {credential.certificateNumber}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          No certifications published yet.
        </Text>
      )}
    </View>
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
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.cardTitle]}>
        Local government and cooperative endorsements
      </Text>
      {hasEndorsements ? (
        <View>
          {endorsements.map((endorsement) => (
            <View key={endorsement.id} style={styles.publicRow}>
              <CertificateThumbnail
                storagePath={endorsement.documentPath}
                title={ENDORSEMENT_TYPE_LABELS[endorsement.endorsementType]}
              />
              <View style={styles.publicRowBody}>
                <Text style={[TYPE.bodyStrong, styles.publicRowTitle]}>
                  {ENDORSEMENT_TYPE_LABELS[endorsement.endorsementType]}
                </Text>
                <Text style={[TYPE.bodySm, styles.publicRowSub]}>
                  {endorsement.issuingOffice}
                </Text>
                <Text style={[TYPE.bodySm, styles.publicRowSub]}>
                  {endorsement.municipality}
                </Text>
                <Text style={[TYPE.captionSm, styles.publicRowCaption]}>
                  Issued {formatDateOnly(endorsement.dateIssued)}
                </Text>
              </View>
            </View>
          ))}
          {affiliations.map((affiliation) => (
            <View key={affiliation.id} style={styles.publicRow}>
              <CertificateThumbnail
                storagePath={affiliation.proofPath}
                title={`${affiliation.organizationName} proof of affiliation`}
              />
              <View style={styles.publicRowBody}>
                <Text style={[TYPE.bodyStrong, styles.publicRowTitle]}>
                  {affiliation.organizationName}
                </Text>
                <Text style={[TYPE.captionSm, styles.publicRowCaption]}>
                  FCA / Farmers&apos; Association / Cooperative membership
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[TYPE.bodySm, styles.mutedCopy]}>
          No endorsements published yet.
        </Text>
      )}
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
            Sign in to view farmer profiles — their registrations, certifications,
            endorsements, and the Verified Rice Farmer badge.
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
    const seals = credentials.filter(
      (credential) => credential.credentialType === CREDENTIAL_TYPES.RMN_SEAL
    )
    const certifications = credentials.filter(
      (credential) => credential.credentialType !== CREDENTIAL_TYPES.RMN_SEAL
    )
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.identityHeader}>
            <Text style={[TYPE.headingSm, styles.identityName]} numberOfLines={2}>
              {profile.fullName || 'Farmer'}
            </Text>
            <VerificationStatusBadge status={profile.verificationStatus} />
          </View>
          <View style={styles.identityRow}>
            {avatarUrl ? (
              <Photo
                uri={avatarUrl}
                alt={`${profile.fullName || 'Farmer'} profile photo`}
                fallbackLabel={profile.fullName || 'Farmer'}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={[TYPE.headingMd, styles.avatarInitials]}>
                  {getInitials(profile.fullName)}
                </Text>
              </View>
            )}
            <View style={styles.identityBody}>
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
        <RegistrationsCard profile={profile} seals={seals} />
        <CertificationsCard credentials={certifications} />
        <EndorsementsCard endorsements={endorsements} affiliations={affiliations} />

        {detailsError ? (
          <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.errorText]}>
            {detailsError}
          </Text>
        ) : null}

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
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  identityName: {
    flex: 1,
    color: COLORS.ink,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: COLORS.ink,
  },
  identityBody: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xxs,
  },
  identityMeta: {
    color: COLORS.mute,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  recordRow: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.md,
  },
  recordRowStacked: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.md,
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
  publicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    marginTop: SPACING.md,
  },
  publicRowBody: {
    flex: 1,
    minWidth: 0,
  },
  publicRowTitle: {
    color: COLORS.ink,
  },
  publicRowSub: {
    color: COLORS.body,
  },
  publicRowCaption: {
    color: COLORS.mute,
    marginTop: SPACING.xxs,
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
