import { useEffect, useRef } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Avatar from '../Avatar'
import Icon from '../Icon'
import MessageBubble from './MessageBubble'
import MessageComposer from './MessageComposer'
import ListingContextBar from './ListingContextBar'
import MessageSuggestions from './MessageSuggestions'
import useConversation from '../../hooks/useConversation'
import useConversationListing from '../../hooks/useConversationListing'
import useListingTransaction from '../../hooks/useListingTransaction'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import { getConversationRole } from '../../services/messaging'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import { formatDate } from '../../utils/format'
import type { RootStackParamList } from '../../types/navigation'

const EMPTY_ICON_SIZE = 32
const STATUS_ICON_SIZE = 14

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

interface MessageThreadProps {
  conversationId: string
  viewerId: string
}

function MessageThread({ conversationId, viewerId }: MessageThreadProps) {
  const {
    conversation,
    messages,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore,
    isSending,
    sendError,
    send,
  } = useConversation({ conversationId })
  const conversationListing = useConversationListing(conversation)
  const { transaction } = useListingTransaction(conversation?.listing_id ?? null)
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const reviewed = useMyReviewedTransactionIds(viewerId)
  const scrollRef = useRef<ScrollView | null>(null)

  const canReview =
    transaction !== null &&
    transaction.status === 'sold' &&
    transaction.buyer_id !== null &&
    !reviewed.has(transaction.id)

  const transactionLabel =
    transaction === null
      ? ''
      : transaction.status === 'sold'
        ? transaction.buyer_id === viewerId
          ? 'You bought this'
          : `Sold to ${transaction.buyer_name ?? 'a buyer'}`
        : transaction.buyer_id === viewerId
          ? 'Reserved for you'
          : `Reserved for ${transaction.buyer_name ?? 'a buyer'}`

  const role = conversation ? getConversationRole(conversation, viewerId) : null
  const counterpartName = conversation
    ? role === 'buyer'
      ? conversation.seller_name
      : conversation.buyer_name
    : ''

  const openListing = () => {
    if (conversation?.listing_id) {
      navigation.navigate('ListingDetail', { listingId: conversation.listing_id })
    }
  }

  useEffect(() => {
    // jump to the newest turn whenever the transcript grows
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages.length])

  const renderMessages = () => {
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
            onPress={refresh}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    if (messages.length === 0) {
      if (role === 'buyer') {
        return (
          <View style={styles.emptyBlock}>
            <Icon name="chat" size={EMPTY_ICON_SIZE} color={COLORS.mute} />
            <Text style={[TYPE.headingSm, styles.emptyTitle]}>Ask about this listing.</Text>
            <Text style={[TYPE.bodySm, styles.emptyHint]}>Tap a question to send it.</Text>
            <MessageSuggestions
              onSelect={(text) => {
                void send(text)
              }}
              disabled={isSending}
            />
          </View>
        )
      }
      return (
        <View style={styles.emptyBlock}>
          <Icon name="chat" size={EMPTY_ICON_SIZE} color={COLORS.mute} />
          <Text style={[TYPE.headingSm, styles.emptyTitle]}>Say hello.</Text>
          <Text style={[TYPE.bodySm, styles.emptyHint]}>
            Send the first message to start the conversation.
          </Text>
        </View>
      )
    }
    return (
      <View style={styles.messages}>
        {hasMore ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isLoadingMore }}
            disabled={isLoadingMore}
            onPress={loadMore}
            style={({ pressed }) => [styles.loadEarlier, pressed && styles.pressed]}
          >
            <Text style={[TYPE.buttonSm, styles.loadEarlierLabel]}>
              {isLoadingMore ? 'Loading…' : 'Load earlier messages'}
            </Text>
          </Pressable>
        ) : null}
        {messages.map((message, index) => {
          const previous = messages[index - 1]
          const showDay = !previous || !isSameDay(previous.created_at, message.created_at)
          return (
            <View key={message.id} style={styles.messageGroup}>
              {showDay ? (
                <Text style={[TYPE.captionSm, styles.dayLabel]}>
                  {formatDate(message.created_at)}
                </Text>
              ) : null}
              <MessageBubble message={message} isViewer={message.sender_id === viewerId} />
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {conversation ? (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Avatar name={counterpartName} />
            <View style={styles.headerText}>
              <View style={styles.nameRow}>
                <Text style={[TYPE.cardTitle, styles.headerName]} numberOfLines={1}>
                  {counterpartName}
                </Text>
                {role ? (
                  <View style={styles.roleTag}>
                    <Text style={[TYPE.captionXs, styles.roleText]}>
                      {role === 'buyer' ? 'Seller' : 'Buyer'}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
          {transactionLabel ? (
            <View
              style={[
                styles.statusChip,
                transaction?.status === 'reserved'
                  ? styles.statusReserved
                  : styles.statusSold,
              ]}
            >
              {transaction?.status === 'sold' ? (
                <Icon name="check" size={STATUS_ICON_SIZE} color={COLORS.ink} />
              ) : null}
              <Text style={[TYPE.captionXs, styles.statusText]}>{transactionLabel}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      {conversation ? (
        <ListingContextBar
          title={conversation.listing_title}
          listing={conversationListing.listing}
          imageUrl={conversationListing.imageUrl}
          isLoading={conversationListing.isLoading}
          isUnavailable={conversationListing.isUnavailable}
          onOpen={conversation.listing_id ? openListing : undefined}
        />
      ) : null}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderMessages()}
      </ScrollView>
      {canReview && transaction ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('ReviewForm', { transactionId: transaction.id })
          }
          style={({ pressed }) => [styles.reviewButton, pressed && styles.pressed]}
        >
          <Text style={[TYPE.buttonSm, styles.reviewLabel]}>Leave a review</Text>
        </Pressable>
      ) : null}
      <MessageComposer onSend={send} isSending={isSending} error={sendError} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerName: {
    flexShrink: 1,
    color: COLORS.ink,
  },
  roleTag: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 1,
  },
  roleText: {
    color: COLORS.mute,
  },
  statusChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  statusReserved: {
    borderColor: COLORS.warningBright,
    backgroundColor: COLORS.accentYellowPale,
  },
  statusSold: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  statusText: {
    color: COLORS.ink,
  },
  reviewButton: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.md,
  },
  reviewLabel: {
    color: COLORS.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: SPACING.lg,
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
    marginTop: SPACING.md,
  },
  emptyHint: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  messages: {
    gap: SPACING.md,
  },
  messageGroup: {
    gap: SPACING.md,
  },
  dayLabel: {
    color: COLORS.mute,
    textAlign: 'center',
    marginVertical: SPACING.sm,
  },
  loadEarlier: {
    minHeight: TOUCH_TARGET,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
  },
  loadEarlierLabel: {
    color: COLORS.ink,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default MessageThread
