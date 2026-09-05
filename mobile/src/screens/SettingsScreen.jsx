// Settings tab — the signed-out state explains what one account unlocks and
// opens the auth dialog (Sign in / Create an account); the signed-in state
// shows the account summary (display name + email). Session actions live in
// the tab bar's fifth action cell (Login signed-out / Logout signed-in,
// DESIGN.md chrome rule).
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Button from '../components/Button.jsx'
import TabScreen from '../components/TabScreen.jsx'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext.js'
import { getDisplayName } from '../utils/userProfile.js'
import { COLORS, GUTTER, SPACING, TYPE } from '../theme/designTokens.js'

const ACCOUNT_BENEFITS = [
  'PalaySigla Assistant — chat history follows your account',
  'Scans, listings, and preferences all hang off one identity',
]

function SignedOutAccount({ onSignIn, onCreateAccount }) {
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
        Scan history, posting, and alerts still arrive in later phases.
      </Text>
    </View>
  )
}

function SignedInAccount({ user }) {
  return (
    <View style={styles.panel}>
      <Text style={[TYPE.captionMd, styles.eyebrow]}>Account</Text>
      <Text style={[TYPE.displayLg, styles.title]} numberOfLines={2}>
        {getDisplayName(user)}
      </Text>
      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={[TYPE.captionSm, styles.detailKey]}>Email</Text>
          <Text style={[TYPE.bodySm, styles.detailValue]} numberOfLines={2}>
            {user.email}
          </Text>
        </View>
      </View>
      <Text style={[TYPE.captionSm, styles.status]}>
        Signed in on this device. Sign out lives in the tab bar.
      </Text>
    </View>
  )
}

function SettingsScreen() {
  const { user, openAuthModal } = useAuth()

  if (user) {
    return (
      <TabScreen>
        <SignedInAccount user={user} />
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
  detailRow: {
    gap: SPACING.xs,
  },
  detailKey: {
    color: COLORS.mute,
  },
  detailValue: {
    color: COLORS.ink,
  },
})

export default SettingsScreen
