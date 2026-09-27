import Button from '../Button'
import Icon from '../Icon'
import ConversationListItem from './ConversationListItem'
import type { ConversationSummary } from '../../types/domain'

const SKELETON_COUNT = 4

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
  onBrowseMarketplace?: () => void
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
  onBrowseMarketplace,
}: ConversationListProps) {
  if (isInitialLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-sm bg-surface-soft" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="border border-error bg-surface-soft p-6 text-center" role="alert">
        <p className="body-strong text-ink">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
        >
          Try again
        </button>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center border border-hairline bg-surface-soft p-8 text-center">
        <Icon name="chat" className="h-8 w-8 text-mute" />
        <p className="heading-sm mt-3 text-ink">No conversations yet.</p>
        <p className="body-sm mt-2 max-w-xs text-mute">
          Message a seller from any listing to start a conversation.
        </p>
        {onBrowseMarketplace && (
          <div className="mt-6">
            <Button variant="outline" onClick={onBrowseMarketplace}>
              Browse the marketplace
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            viewerId={viewerId}
            isActive={conversation.id === activeConversationId}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="h-11 border border-hairline bg-canvas px-6 button-md text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
          >
            {isLoadingMore ? 'Loading more…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}

export default ConversationList
