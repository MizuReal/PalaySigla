import { Pressable, StyleSheet, Text, View } from 'react-native'
import { formatRelativeTime } from '../../utils/format'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { ConversationSummary } from '../../types/domain'

const PREVIEW_FALLBACK = 'No messages yet'
const MAX_BADGE_COUNT = 9

interface ConversationListItemProps {
  conversation: ConversationSummary
  viewerId: string
  isActive: boolean
  onSelect: (conversationId: string) => void
}

function ConversationListItem({
  conversation,
  viewerId,
  isActive,
  onSelect,
}: ConversationListItemProps) {
  const isBuyer = conversation.buyer_id === viewerId
  const counterpartName = isBuyer ? conversation.seller_name : conversation.buyer_name
  const preview = conversation.last_message_preview ?? PREVIEW_FALLBACK
  const badgeLabel =
    conversation.unreadCount > MAX_BADGE_COUNT ? '9+' : String(conversation.unreadCount)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={() => onSelect(conversation.id)}
      style={({ pressed }) => [
        styles.row,
        isActive && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.topRow}>
        <Text style={[TYPE.cardTitle, styles.name]} numberOfLines={1}>
          {counterpartName}
        </Text>
        {conversation.last_message_at ? (
          <Text style={[TYPE.captionSm, styles.time]}>
            {formatRelativeTime(conversation.last_message_at)}
          </Text>
        ) : null}
      </View>
      <Text style={[TYPE.captionSm, styles.listing]} numberOfLines={1}>
        {conversation.listing_title}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={[TYPE.bodySm, styles.preview]} numberOfLines={1}>
          {preview}
        </Text>
        {conversation.unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={[TYPE.captionXs, styles.badgeText]}>{badgeLabel}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
  },
  rowActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceSoft,
  },
  rowPressed: {
    opacity: 0.7,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  name: {
    flex: 1,
    color: COLORS.ink,
  },
  time: {
    color: COLORS.mute,
  },
  listing: {
    color: COLORS.primary,
    marginTop: SPACING.xxs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  preview: {
    flex: 1,
    color: COLORS.mute,
  },
  badge: {
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
  },
  badgeText: {
    color: COLORS.onPrimary,
  },
})

export default ConversationListItem
