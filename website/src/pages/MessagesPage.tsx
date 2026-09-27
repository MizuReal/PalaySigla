import { useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Container from '../components/Container'
import Footer from '../components/site/Footer'
import PrimaryNav from '../components/site/PrimaryNav'
import ConversationList from '../components/messages/ConversationList'
import MessageThread from '../components/messages/MessageThread'
import useConversations from '../hooks/useConversations'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'

function MessagesPage() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const navigate = useNavigate()
  const { user, isInitializing, openAuthModal } = useAuth()
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
      <Container className="py-4 md:py-5">
        <p className="caption-md text-primary">Messages</p>
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
            <div className={conversationId ? 'hidden lg:block' : ''}>
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
              />
            </div>
            <div
              className={`min-h-0 h-[calc(100dvh-11rem)] lg:h-[calc(100dvh-12rem)] ${
                conversationId ? '' : 'hidden lg:block'
              }`}
            >
              {conversationId ? (
                <MessageThread
                  key={conversationId}
                  conversationId={conversationId}
                  viewerId={user.id}
                  onBack={handleBack}
                />
              ) : (
                <div className="flex h-full items-center justify-center border border-hairline bg-surface-soft p-10 text-center">
                  <p className="body-sm text-mute">Select a conversation to read and reply.</p>
                </div>
              )}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  )
}

export default MessagesPage
