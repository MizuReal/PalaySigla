import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import ConversationListItem from './ConversationListItem'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { ConversationSummary } from '../../types/domain'

interface ConversationListProps {
  conversations: ConversationSummary[]
  viewerId: string
  activeConversationId: string | null
  isInitialLoading: boolean
  isLoadingMore: boolean
  error: string
  hasMore: boolean
  onSelect: (conversationId: string) => void
  onLoadMore: () => void
  onRetry: () => void
}

function ConversationList({
  conversations,
  viewerId,
  activeConversationId,
  isInitialLoading,
  isLoadingMore,
  error,
  hasMore,
  onSelect,
  onLoadMore,
  onRetry,
}: ConversationListProps) {
  if (isInitialLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorBlock}>
        <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.errorText]}>
          {error}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
        </Pressable>
      </View>
    )
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyBlock}>
        <Text style={[TYPE.headingSm, styles.emptyTitle]}>No conversations yet.</Text>
        <Text style={[TYPE.bodySm, styles.emptyHint]}>
          Open a listing and use Message seller to start a conversation.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.list}>
      {conversations.map((conversation) => (
        <ConversationListItem
          key={conversation.id}
          conversation={conversation}
          viewerId={viewerId}
          isActive={conversation.id === activeConversationId}
          onSelect={onSelect}
        />
      ))}
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoadingMore }}
          disabled={isLoadingMore}
          onPress={onLoadMore}
          style={({ pressed }) => [
            styles.loadMore,
            isLoadingMore && styles.disabled,
            pressed && !isLoadingMore && styles.pressed,
          ]}
        >
          <Text style={[TYPE.buttonSm, styles.loadMoreLabel]}>
            {isLoadingMore ? 'Loading more…' : 'Load more'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    gap: SPACING.md,
  },
  centered: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  errorBlock: {
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  retry: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  retryLabel: {
    color: COLORS.ink,
  },
  emptyBlock: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    color: COLORS.ink,
  },
  emptyHint: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  loadMore: {
    minHeight: TOUCH_TARGET,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  loadMoreLabel: {
    color: COLORS.ink,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ConversationList
