import { Pressable, StyleSheet, Text, View } from 'react-native'
import Avatar from '../Avatar'
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
  const counterpartRole = isBuyer ? 'Seller' : 'Buyer'
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
      <Avatar name={counterpartName} />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            <Text style={[TYPE.cardTitle, styles.name]} numberOfLines={1}>
              {counterpartName}
            </Text>
            <View style={styles.roleTag}>
              <Text style={[TYPE.captionXs, styles.roleText]}>{counterpartRole}</Text>
            </View>
          </View>
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
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    minHeight: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
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
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  nameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  name: {
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
