import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import Icon from '../components/Icon'
import PrimaryNav from '../components/site/PrimaryNav'
import ConversationList from '../components/messages/ConversationList'
import ListingDetailModal from '../components/marketplace/ListingDetailModal'
import MessageThread from '../components/messages/MessageThread'
import useConversations from '../hooks/useConversations'
import useUnreadMessageCount from '../hooks/useUnreadMessageCount'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'

function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user, isInitializing, openAuthModal } = useAuth()
  const unreadTotal = useUnreadMessageCount()
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null)
  const {
    conversations,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    refresh,
    hasMore,
  } = useConversations()

  const renderHeader = () => (
    <div className="border-b border-hairline bg-canvas">
      <Container className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between md:py-5">
        <div>
          <p className="caption-md text-primary">Messages</p>
          <h1 className="heading-md mt-1 text-ink">Your conversations</h1>
        </div>
        {unreadTotal > 0 && (
          <span className="caption-xs self-start rounded-sm bg-primary px-2 py-1 text-on-primary sm:self-auto">
            {unreadTotal} unread
          </span>
        )}
      </Container>
    </div>
  )

  if (isInitializing) {
    return (
      <>
        <PrimaryNav />
        <main>{renderHeader()}</main>
        <Footer />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <PrimaryNav />
        <main>
          {renderHeader()}
          <Container className="py-10 md:py-[64px]">
            <div className="border border-hairline bg-surface-soft p-10 text-center">
              <p className="heading-sm text-ink">Sign in to see your messages.</p>
              <p className="body-sm mt-2 text-mute">
                Conversations are private to the buyer and the seller.
              </p>
              <div className="mt-6 flex justify-center">
                <Button onClick={() => openAuthModal(AUTH_MODAL_MODES.LOGIN)}>Sign in</Button>
              </div>
            </div>
          </Container>
        </main>
        <Footer />
      </>
    )
  }

  const handleSelect = (id: string) => navigate(`/messages/${id}`)
  const handleBack = () => navigate('/messages')

  return (
    <>
      <PrimaryNav />
      <main>
        {renderHeader()}
        <Container className="py-6 md:py-8">
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div
              className={`border border-hairline bg-canvas shadow-panel lg:flex lg:h-[calc(100dvh-12rem)] lg:flex-col lg:overflow-hidden ${
                conversationId ? 'hidden lg:flex' : ''
              }`}
            >
              <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  viewerId={user.id}
                  activeConversationId={conversationId ?? null}
                  isInitialLoading={isInitialLoading}
                  isLoadingMore={isLoadingMore}
                  error={error}
                  hasMore={hasMore}
                  onSelect={handleSelect}
                  onLoadMore={loadMore}
                  onRetry={refresh}
                  onBrowseMarketplace={() => navigate('/marketplace')}
                />
              </div>
            </div>
            <div
              className={`min-h-0 h-[calc(100dvh-11rem)] overflow-hidden border border-hairline bg-canvas shadow-panel lg:h-[calc(100dvh-12rem)] ${
                conversationId ? '' : 'hidden lg:block'
              }`}
            >
              {conversationId ? (
                <MessageThread
                  key={conversationId}
                  conversationId={conversationId}
                  viewerId={user.id}
                  onBack={handleBack}
                  onOpenListing={setSelectedListingId}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-surface-soft p-10 text-center">
                  <Icon name="chat" className="h-8 w-8 text-mute" />
                  <p className="heading-sm text-ink">Your messages live here.</p>
                  <p className="body-sm max-w-sm text-mute">
                    Pick a conversation from the inbox, or message a seller from any listing.
                  </p>
                  <div className="mt-2">
                    <Button variant="outline" to="/marketplace">
                      Browse the marketplace
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
      {selectedListingId && (
        <ListingDetailModal
          key={selectedListingId}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onChanged={refresh}
        />
      )}
    </>
  )
}

export default MessagesPage
