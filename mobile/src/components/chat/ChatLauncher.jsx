// Floating assistant launcher above the tab bar — the mobile counterpart of
// the website's chat widget button: a 48px `{colors.primary}` square with a
// black chat glyph (the raised Scan cell's geometry, unraised). Signed-in
// taps open the chat bottom sheet; signed-out taps open the auth dialog with
// a chat intent, so a successful login lands straight in the chat sheet.
import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext.js'
import { TAB_BAR_HEIGHT } from '../AppTabBar.jsx'
import Icon from '../Icon.jsx'
import { COLORS, RADIUS, SPACING } from '../../theme/designTokens.js'

const LAUNCHER_SIZE = 48

function ChatLauncher() {
  const insets = useSafeAreaInsets()
  const { user, isInitializing, openAuthModal, openChat } = useAuth()

  const handlePress = () => {
    // a cold-start tap before the stored session is restored must not be
    // misrouted to sign-in
    if (isInitializing) {
      return
    }
    if (user) {
      openChat()
    } else {
      openAuthModal(AUTH_MODAL_MODES.LOGIN, { chatIntent: true })
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={
        user
          ? 'Open PalaySigla assistant chat'
          : 'Open PalaySigla assistant. Sign in required.'
      }
      style={({ pressed }) => [
        styles.launcher,
        {
          bottom: TAB_BAR_HEIGHT + insets.bottom + SPACING.lg,
        },
        pressed && styles.launcherPressed,
      ]}
    >
      <Icon name="chat" size={24} color={COLORS.onPrimary} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  launcher: {
    position: 'absolute',
    right: SPACING.xl,
    width: LAUNCHER_SIZE,
    height: LAUNCHER_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 6,
  },
  launcherPressed: {
    backgroundColor: COLORS.primaryDark,
  },
})

export default ChatLauncher
