import { useEffect, useRef, useState } from 'react'
import Avatar from '../Avatar'
import Icon from '../Icon'
import MessageComposer from './MessageComposer'
import ListingContextBar from './ListingContextBar'
import MessageSuggestions from './MessageSuggestions'
import ReviewFormModal from '../profile/ReviewFormModal'
import useConversation from '../../hooks/useConversation'
import useConversationListing from '../../hooks/useConversationListing'
import useListingTransaction from '../../hooks/useListingTransaction'
import useMyReviewedTransactionIds from '../../hooks/useMyReviewedTransactionIds'
import { useAuth } from '../../context/authContext'
import { getConversationRole } from '../../services/messaging'
import { formatDate } from '../../utils/format'
import { getDisplayName } from '../../utils/userProfile'
import type { ThreadMessage } from '../../hooks/useConversation'

const TIME_FORMAT: Intl.DateTimeFormatOptions = Object.freeze({
  hour: 'numeric',
  minute: '2-digit',
})

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-PH', TIME_FORMAT)
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

interface MessageBubbleProps {
  message: ThreadMessage
  isViewer: boolean
}

function MessageBubble({ message, isViewer }: MessageBubbleProps) {
  const bubbleClasses = isViewer
    ? 'bg-primary text-on-primary'
    : 'border border-hairline bg-surface-soft text-ink'
  return (
    <li className={`flex ${isViewer ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-sm px-3.5 py-2.5 ${bubbleClasses}`}>
        <p className="body-md whitespace-pre-line break-words">{message.body}</p>
        <p
          className={`caption-xs mt-1 text-right ${
            isViewer ? 'text-on-primary opacity-80' : 'text-mute'
          }`}
        >
          {message.pending ? 'Sending…' : formatTime(message.created_at)}
        </p>
      </div>
    </li>
  )
}

interface MessageThreadProps {
  conversationId: string
  viewerId: string
  onBack?: () => void
  onOpenListing?: (listingId: string) => void
}

function MessageThread({
  conversationId,
  viewerId,
  onBack,
  onOpenListing,
}: MessageThreadProps) {
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
  const { user } = useAuth()
  const reviewed = useMyReviewedTransactionIds(viewerId)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const role = conversation ? getConversationRole(conversation, viewerId) : null
  const counterpartName = conversation
    ? role === 'buyer'
      ? conversation.seller_name
      : conversation.buyer_name
    : ''

  const openListing = () => {
    if (conversation?.listing_id && onOpenListing) {
      onOpenListing(conversation.listing_id)
    }
  }

  const renderMessages = () => {
    if (isInitialLoading) {
      return (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className={`h-12 w-2/3 animate-pulse rounded-sm bg-surface-soft ${
                index % 2 === 0 ? 'self-start' : 'self-end'
              }`}
            />
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
            onClick={refresh}
            className="mt-4 border border-hairline bg-canvas px-4 py-2.5 button-sm text-ink transition-colors hover:border-primary hover:text-primary"
          >
            Try again
          </button>
        </div>
      )
    }
    if (messages.length === 0) {
      if (role === 'buyer') {
        return (
          <div className="flex flex-col items-center border border-hairline bg-surface-soft p-8 text-center">
            <Icon name="chat" className="h-8 w-8 text-mute" />
            <p className="heading-sm mt-3 text-ink">Ask about this listing.</p>
            <p className="body-sm mt-2 text-mute">Tap a question to send it.</p>
            <MessageSuggestions
              onSelect={(text) => {
                void send(text)
              }}
              disabled={isSending}
            />
          </div>
        )
      }
      return (
        <div className="flex flex-col items-center border border-hairline bg-surface-soft p-8 text-center">
          <Icon name="chat" className="h-8 w-8 text-mute" />
          <p className="heading-sm mt-3 text-ink">Say hello.</p>
          <p className="body-sm mt-2 text-mute">
            Send the first message to start the conversation.
          </p>
        </div>
      )
    }
    return (
      <>
        {hasMore && (
          <div className="mb-4 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoadingMore}
              className="border border-hairline bg-canvas px-4 py-2 button-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:text-ash"
            >
              {isLoadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const showDay = !previous || !isSameDay(previous.created_at, message.created_at)
            return (
              <li key={message.id} className="flex flex-col gap-3">
                {showDay && (
                  <p className="caption-sm my-2 text-center text-mute">
                    {formatDate(message.created_at)}
                  </p>
                )}
                <ul className="flex flex-col gap-3">
                  <MessageBubble message={message} isViewer={message.sender_id === viewerId} />
                </ul>
              </li>
            )
          })}
        </ul>
      </>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-4 md:px-5">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to inbox"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-hairline text-ink transition-colors hover:border-primary hover:text-primary lg:hidden"
          >
            <Icon name="chevron-left" className="h-5 w-5" />
          </button>
        )}
        <Avatar name={counterpartName} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="card-title truncate text-ink">{counterpartName}</p>
            {role && (
              <span className="caption-xs shrink-0 rounded-sm border border-hairline bg-surface-soft px-1.5 py-0.5 text-mute">
                {role === 'buyer' ? 'Seller' : 'Buyer'}
              </span>
            )}
          </div>
          {transactionLabel && (
            <span
              className={`mt-1 inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 caption-xs ${
                transaction?.status === 'reserved'
                  ? 'border-warning-bright bg-accent-yellow-pale text-ink'
                  : 'border-hairline bg-surface-soft text-ink'
              }`}
            >
              {transaction?.status === 'sold' && <Icon name="check" className="h-3 w-3" />}
              {transactionLabel}
            </span>
          )}
        </div>
      </div>
      {conversation && (
        <ListingContextBar
          title={conversation.listing_title}
          listing={conversationListing.listing}
          imageUrl={conversationListing.imageUrl}
          isLoading={conversationListing.isLoading}
          isUnavailable={conversationListing.isUnavailable}
          onOpen={conversation.listing_id && onOpenListing ? openListing : undefined}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        {renderMessages()}
        <div ref={bottomRef} />
      </div>
      {canReview && (
        <div className="border-t border-hairline px-4 pb-3 pt-3 md:px-5">
          <button
            type="button"
            onClick={() => setIsReviewOpen(true)}
            className="h-10 border border-primary px-4 button-sm text-ink transition-colors hover:bg-primary hover:text-on-primary"
          >
            Leave a review
          </button>
        </div>
      )}
      <MessageComposer onSend={send} isSending={isSending} error={sendError} />
      {isReviewOpen && transaction && user && (
        <ReviewFormModal
          transaction={transaction}
          viewerId={user.id}
          viewerName={getDisplayName(user)}
          onClose={() => setIsReviewOpen(false)}
        />
      )}
    </div>
  )
}

export default MessageThread
