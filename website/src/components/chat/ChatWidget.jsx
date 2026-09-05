import { useCallback, useEffect, useRef, useState } from 'react'
import { AUTH_MODAL_MODES, useAuth } from '../../context/authContext.js'
import { sendChatMessage } from '../../services/chatbot.js'
import Icon from '../Icon.jsx'

const MAX_HISTORY_MESSAGES = 20
const MAX_MESSAGE_CHARS = 2000
const CHAT_STORAGE_KEY_PREFIX = 'palaysigla:chat:'

const WELCOME_TEXT =
  'Hello! Ako ang PalaySigla Assistant — nandito ako para sa mga tanong tungkol sa palay at bigas: ' +
  'quality assessment, pag-iimbak, pagpapatuyo, moisture, amag at peste, market grade, at iba pa. ' +
  'Ano ang gusto mong malaman?'

const SUGGESTED_QUESTIONS = Object.freeze([
  'Paano mag-imbak ng palay nang hindi nabubulok?',
  'Ano ang tamang moisture content ng tuyong palay?',
  'Paano malalaman kung may amag o bukbok ang bigas?',
])

// paired-marker scrubber mirrors the backend sanitizer for history written before
// the plain-text rule shipped; content words are never rewritten, only markers removed
function stripLegacyMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/gs, '$1')
    .replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/gs, '$1')
    .replace(/__(.+?)__/gs, '$1')
    .replace(/(?<!_)_(?!\s)(.+?)(?<!\s)_(?!_)/gs, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*`]/g, '')
}

function readStoredMessages(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(
        (turn) =>
          typeof turn?.content === 'string' &&
          (turn?.role === 'user' || turn?.role === 'assistant')
      )
      .map((turn) => ({ role: turn.role, content: stripLegacyMarkdown(turn.content) }))
  } catch {
    // unreadable or blocked storage must never block the chat
    return []
  }
}

function writeStoredMessages(storageKey, messages) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES)))
  } catch {
    // quota or privacy-mode failures are non-fatal: history is best-effort only
  }
}

function clearStoredMessages(storageKey) {
  try {
    localStorage.removeItem(storageKey)
  } catch {
    // history is best-effort only; a blocked removal must not break the chat
  }
}

const CLEAR_CONFIRM_RESET_MS = 4000

function TypingBubble() {
  return (
    <div
      role="status"
      aria-label="The assistant is typing"
      className="flex w-fit items-center gap-1.5 border border-hairline bg-surface-soft px-4 py-3"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mute" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mute" />
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-mute" />
    </div>
  )
}

function WelcomeBubble({ onPick }) {
  return (
    <div className="w-fit max-w-[85%] border border-hairline bg-surface-soft px-4 py-3">
      <p className="body-sm whitespace-pre-wrap text-ink">{WELCOME_TEXT}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => onPick(question)}
              className="flex min-h-11 w-full items-center rounded-sm border border-hairline bg-canvas px-3 text-left body-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChatWidget() {
  const { user, openAuthModal } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [conversationOwnerId, setConversationOwnerId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [failedContent, setFailedContent] = useState(null)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  const launcherRef = useRef(null)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const isWaitingRef = useRef(false)
  const clearConfirmTimeoutRef = useRef(null)

  const storageKey = user ? `${CHAT_STORAGE_KEY_PREFIX}${user.id}` : null
  const isChatVisible = isOpen && user !== null && conversationOwnerId === user.id

  const resetClearConfirmation = useCallback(() => {
    if (clearConfirmTimeoutRef.current !== null) {
      window.clearTimeout(clearConfirmTimeoutRef.current)
      clearConfirmTimeoutRef.current = null
    }
    setIsConfirmingClear(false)
  }, [])

  const clearConversation = useCallback(() => {
    if (messages.length === 0 || !storageKey || isWaitingRef.current) {
      return
    }
    if (isConfirmingClear) {
      clearStoredMessages(storageKey)
      setMessages([])
      setErrorMessage(null)
      setFailedContent(null)
      resetClearConfirmation()
      return
    }
    setIsConfirmingClear(true)
    clearConfirmTimeoutRef.current = window.setTimeout(resetClearConfirmation, CLEAR_CONFIRM_RESET_MS)
  }, [messages.length, storageKey, isConfirmingClear, resetClearConfirmation])

  const submitMessage = useCallback(
    async (content, baseMessages) => {
      const trimmed = content.trim()
      if (!trimmed || isWaitingRef.current || !user) {
        return
      }

      const userTurn = { role: 'user', content: trimmed }
      const nextMessages = [...baseMessages, userTurn].slice(-MAX_HISTORY_MESSAGES)
      setMessages(nextMessages)
      setDraft('')
      setErrorMessage(null)
      setFailedContent(null)
      isWaitingRef.current = true
      setIsWaiting(true)
      try {
        const { reply } = await sendChatMessage(nextMessages)
        const completed = [...nextMessages, { role: 'assistant', content: reply }].slice(
          -MAX_HISTORY_MESSAGES
        )
        setMessages(completed)
        if (storageKey) {
          writeStoredMessages(storageKey, completed)
        }
      } catch (error) {
        setFailedContent(trimmed)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The assistant returned an error. Please try again.'
        )
        // keep the user's message visible so retry has something to resend
        if (storageKey) {
          writeStoredMessages(storageKey, nextMessages)
        }
      } finally {
        isWaitingRef.current = false
        setIsWaiting(false)
      }
    },
    [storageKey, user]
  )

  const openChat = useCallback(() => {
    if (!user) {
      openAuthModal(AUTH_MODAL_MODES.LOGIN)
      return
    }
    setMessages(readStoredMessages(`${CHAT_STORAGE_KEY_PREFIX}${user.id}`))
    setConversationOwnerId(user.id)
    setErrorMessage(null)
    setFailedContent(null)
    resetClearConfirmation()
    setIsOpen(true)
  }, [user, openAuthModal, resetClearConfirmation])

  const closeChat = useCallback(() => {
    setIsOpen(false)
    setErrorMessage(null)
    setFailedContent(null)
    resetClearConfirmation()
    launcherRef.current?.focus()
  }, [resetClearConfirmation])

  const handleFormSubmit = useCallback(
    (event) => {
      event.preventDefault()
      void submitMessage(draft, messages)
    },
    [draft, messages, submitMessage]
  )

  const pickSuggestedQuestion = useCallback(
    (question) => {
      void submitMessage(question, messages)
    },
    [messages, submitMessage]
  )

  const retryFailedMessage = useCallback(() => {
    if (!failedContent) {
      return
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user' && messages[index].content === failedContent) {
        void submitMessage(failedContent, messages.slice(0, index))
        return
      }
    }
  }, [failedContent, messages, submitMessage])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeChat()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, closeChat])

  useEffect(() => {
    // mount-only: a pending confirm timer must never fire after the widget unmounts
    return () => {
      if (clearConfirmTimeoutRef.current !== null) {
        window.clearTimeout(clearConfirmTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isChatVisible) {
      inputRef.current?.focus()
    }
  }, [isChatVisible])

  useEffect(() => {
    if (!isChatVisible) {
      return undefined
    }
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
    return undefined
  }, [isChatVisible, isWaiting, messages])

  const canSend = !isWaiting && draft.trim().length > 0

  return (
    <>
      {isChatVisible && (
        <section
          id="palay-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="palay-chat-title"
          className="fixed bottom-24 right-6 z-[55] flex h-[min(32rem,calc(100vh_-_9rem))] w-[min(calc(100vw_-_3rem),22rem)] flex-col rounded-sm border border-hairline bg-canvas shadow-chrome"
        >
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-primary text-on-primary">
                <Icon name="chat" className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p id="palay-chat-title" className="card-title truncate text-ink">
                  PalaySigla Assistant
                </p>
                <p className="caption-sm truncate text-mute">
                  Palay &amp; bigas lang ang sinasagot
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  disabled={isWaiting}
                  aria-label={
                    isConfirmingClear ? 'Confirm clear chat history' : 'Clear chat history'
                  }
                  className={`flex h-11 w-11 items-center justify-center transition-colors ${
                    isConfirmingClear
                      ? 'border border-error text-error'
                      : isWaiting
                        ? 'cursor-not-allowed text-ash'
                        : 'text-mute hover:text-ink'
                  }`}
                >
                  <Icon name={isConfirmingClear ? 'check' : 'trash'} className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={closeChat}
                aria-label="Close chat"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-mute transition-colors hover:text-ink"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            aria-label="Chat history"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && !isWaiting ? (
              <WelcomeBubble onPick={pickSuggestedQuestion} />
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={
                    message.role === 'user'
                      ? 'ml-auto w-fit max-w-[85%] bg-primary px-4 py-3'
                      : 'w-fit max-w-[85%] border border-hairline bg-surface-soft px-4 py-3'
                  }
                >
                  <p
                    className={`body-sm whitespace-pre-wrap ${
                      message.role === 'user' ? 'text-on-primary' : 'text-ink'
                    }`}
                  >
                    {message.content}
                  </p>
                </div>
              ))
            )}
            {isWaiting && <TypingBubble />}
            {errorMessage && (
              <div className="flex items-start gap-3 border border-error bg-surface-soft p-4">
                <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0 text-error" />
                <div className="min-w-0">
                  <p className="body-sm text-ink">{errorMessage}</p>
                  {failedContent && (
                    <button
                      type="button"
                      onClick={retryFailedMessage}
                      className="body-strong -ml-0 mt-1 inline-flex min-h-11 items-center text-primary transition-colors hover:text-primary-dark"
                    >
                      Try again
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <form className="flex items-center gap-2 border-t border-hairline p-3" onSubmit={handleFormSubmit}>
            <label htmlFor="palay-chat-input" className="sr-only">
              Message
            </label>
            <input
              id="palay-chat-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MAX_MESSAGE_CHARS}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Tanong tungkol sa palay o bigas…"
              className="h-11 min-w-0 flex-1 rounded-sm border border-hairline bg-canvas px-4 body-md text-ink transition-colors placeholder:text-mute focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send message"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-primary text-on-primary transition-colors hover:bg-primary-dark disabled:bg-surface-soft disabled:text-ash disabled:hover:bg-surface-soft"
            >
              <Icon name="send" className="h-5 w-5" />
            </button>
          </form>
        </section>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (isChatVisible ? closeChat() : openChat())}
        aria-expanded={isChatVisible}
        aria-controls="palay-chat-panel"
        aria-label={
          isChatVisible
            ? 'Close PalaySigla assistant chat'
            : user
              ? 'Open PalaySigla assistant chat'
              : 'Open PalaySigla assistant. Sign in required.'
        }
        className="fixed bottom-6 right-6 z-[55] flex h-12 w-12 items-center justify-center rounded-sm bg-primary text-on-primary transition-colors hover:bg-primary-dark"
      >
        <Icon name={isChatVisible ? 'close' : 'chat'} className="h-6 w-6" />
      </button>
    </>
  )
}

export default ChatWidget
