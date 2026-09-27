// Marketplace inbox — the mobile counterpart of the web /messages page. Lists
// the signed-in user's listing conversations, newest activity first, with an
// unread badge per row; selecting one pushes the conversation thread.
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import Icon from '../components/Icon'
import ConversationList from '../components/messages/ConversationList'
import useConversations from '../hooks/useConversations'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { COLORS, GUTTER, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

type MessagesScreenProps = NativeStackScreenProps<RootStackParamList, 'Messages'>

function MessagesScreen({ navigation }: MessagesScreenProps) {
  const insets = useSafeAreaInsets()
  const { user, openAuthModal } = useAuth()
  const {
    conversations,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore,
  } = useConversations()

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

      {!user ? (
        <View style={styles.signedOut}>
          <Text style={[TYPE.headingSm, styles.signedOutTitle]}>
            Sign in to see your messages.
          </Text>
          <Text style={[TYPE.bodySm, styles.signedOutHint]}>
            Conversations are private to the buyer and the seller.
          </Text>
          <View style={styles.signedOutAction}>
            <Button
              label="Sign in"
              onPress={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}
              fullWidth
            />
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + SPACING.xxl },
          ]}
        >
          <ConversationList
            conversations={conversations}
            viewerId={user.id}
            activeConversationId={null}
            isInitialLoading={isInitialLoading}
            isLoadingMore={isLoadingMore}
            error={error}
            hasMore={hasMore}
            onSelect={(conversationId) =>
              navigation.navigate('Conversation', { conversationId })
            }
            onLoadMore={loadMore}
            onRetry={refresh}
          />
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
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
  signedOutHint: {
    color: COLORS.mute,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  signedOutAction: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default MessagesScreen
