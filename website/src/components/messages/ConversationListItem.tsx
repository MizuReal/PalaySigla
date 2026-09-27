import Avatar from '../Avatar'
import { formatRelativeTime } from '../../utils/format'
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
  const badgeLabel = conversation.unreadCount > MAX_BADGE_COUNT ? '9+' : conversation.unreadCount

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(conversation.id)}
        aria-current={isActive ? 'true' : undefined}
        className={`flex w-full items-start gap-3 rounded-sm border p-4 text-left transition-colors ${
          isActive
            ? 'border-primary bg-surface-soft'
            : 'border-hairline bg-canvas hover:border-primary'
        }`}
      >
        <Avatar name={counterpartName} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <p className="card-title truncate text-ink">{counterpartName}</p>
              <span className="caption-xs shrink-0 rounded-sm border border-hairline bg-surface-soft px-1.5 py-0.5 text-mute">
                {counterpartRole}
              </span>
            </div>
            {conversation.last_message_at && (
              <span className="caption-sm shrink-0 text-mute">
                {formatRelativeTime(conversation.last_message_at)}
              </span>
            )}
          </div>
          <p className="caption-sm mt-0.5 truncate text-primary">
            {conversation.listing_title}
          </p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="body-sm truncate text-mute">{preview}</p>
            {conversation.unreadCount > 0 && (
              <span className="caption-xs shrink-0 rounded-sm bg-primary px-2 py-0.5 text-on-primary">
                {badgeLabel}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}

export default ConversationListItem
