// A single listing conversation — full-screen root-stack push holding the
// live message thread. Realtime delivery, optimistic sends, and the read
// watermark all live in MessageThread/useConversation.
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import Icon from '../components/Icon'
import MessageThread from '../components/messages/MessageThread'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { COLORS, GUTTER, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

type ConversationScreenProps = NativeStackScreenProps<RootStackParamList, 'Conversation'>

function ConversationScreen({ route, navigation }: ConversationScreenProps) {
  const { conversationId } = route.params
  const insets = useSafeAreaInsets()
  const { user, openAuthModal } = useAuth()

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[TYPE.captionMd, styles.topBarLabel]}>Messages</Text>
        </View>
      </View>

      {user ? (
        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[
              styles.threadWrap,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <MessageThread conversationId={conversationId} viewerId={user.id} />
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.signedOut}>
          <Text style={[TYPE.headingSm, styles.signedOutTitle]}>
            Sign in to view this conversation.
          </Text>
          <View style={styles.signedOutAction}>
            <Button
              label="Sign in"
              onPress={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
              fullWidth
            />
          </View>
        </View>
      )}
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
  body: {
    flex: 1,
  },
  threadWrap: {
    flex: 1,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.md,
  },
  signedOut: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: GUTTER,
  },
  signedOutTitle: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  signedOutAction: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ConversationScreen
