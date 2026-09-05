// Assistant conversation state — port of the website ChatWidget's logic into
// a hook so the screen stays presentational. History persists per user under
// AsyncStorage (mirroring the website's per-user localStorage), bounded to the
// newest MAX_HISTORY_MESSAGES turns. The conversation is owned by the session
// user that loaded it: after a sign-out or account switch the screen renders
// only the signed-in empty state instead of another account's messages.
import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sendChatMessage } from '../services/chatbot.js'

export const MAX_HISTORY_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 2000

const CHAT_STORAGE_KEY_PREFIX = 'palaysigla:chat:'

function storageKeyFor(userId) {
  return `${CHAT_STORAGE_KEY_PREFIX}${userId}`
}

async function readStoredMessages(storageKey) {
  try {
    const raw = await AsyncStorage.getItem(storageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter(
      (turn) =>
        typeof turn?.content === 'string' &&
        (turn?.role === 'user' || turn?.role === 'assistant')
    )
  } catch {
    // unreadable or blocked storage must never block the chat
    return []
  }
}

async function writeStoredMessages(storageKey, messages) {
  try {
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify(messages.slice(-MAX_HISTORY_MESSAGES))
    )
  } catch {
    // storage failures are non-fatal: history is best-effort only
  }
}

async function clearStoredMessages(storageKey) {
  try {
    await AsyncStorage.removeItem(storageKey)
  } catch {
    // history is best-effort only; a blocked removal must not break the chat
  }
}

function usePalayAssistant(sessionUserId) {
  const [conversationOwnerId, setConversationOwnerId] = useState(null)
  const [messages, setMessages] = useState([])
  const [isWaiting, setIsWaiting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [failedContent, setFailedContent] = useState(null)

  const isWaitingRef = useRef(false)

  const conversationReady = Boolean(
    sessionUserId && conversationOwnerId === sessionUserId
  )

  useEffect(() => {
    if (!sessionUserId) {
      return undefined
    }
    let isCurrent = true
    const load = async () => {
      const stored = await readStoredMessages(storageKeyFor(sessionUserId))
      if (isCurrent) {
        setMessages(stored)
        setConversationOwnerId(sessionUserId)
        setErrorMessage(null)
        setFailedContent(null)
      }
    }
    load()
    return () => {
      isCurrent = false
    }
  }, [sessionUserId])

  const submitMessage = useCallback(
    async (content, baseMessages) => {
      const trimmed = content.trim()
      if (!trimmed || isWaitingRef.current || !conversationReady) {
        return
      }
      if (trimmed.length > MAX_MESSAGE_CHARS) {
        setErrorMessage('That message is too long. Please shorten it and try again.')
        return
      }

      const userTurn = { role: 'user', content: trimmed }
      const nextMessages = [...baseMessages, userTurn].slice(-MAX_HISTORY_MESSAGES)
      setMessages(nextMessages)
      setErrorMessage(null)
      setFailedContent(null)
      isWaitingRef.current = true
      setIsWaiting(true)
      const storageKey = storageKeyFor(sessionUserId)
      try {
        const { reply } = await sendChatMessage(nextMessages)
        const completed = [...nextMessages, { role: 'assistant', content: reply }].slice(
          -MAX_HISTORY_MESSAGES
        )
        setMessages(completed)
        await writeStoredMessages(storageKey, completed)
      } catch (error) {
        setFailedContent(trimmed)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'The assistant returned an error. Please try again.'
        )
        // keep the user's message visible so retry has something to resend
        await writeStoredMessages(storageKey, nextMessages)
      } finally {
        isWaitingRef.current = false
        setIsWaiting(false)
      }
    },
    [sessionUserId, conversationReady]
  )

  const retryFailedMessage = useCallback(() => {
    if (!failedContent || !conversationReady) {
      return
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'user' && messages[index].content === failedContent) {
        void submitMessage(failedContent, messages.slice(0, index))
        return
      }
    }
  }, [failedContent, messages, conversationReady, submitMessage])

  const clearConversation = useCallback(async () => {
    if (isWaitingRef.current || !conversationReady) {
      return
    }
    const storageKey = storageKeyFor(sessionUserId)
    await clearStoredMessages(storageKey)
    setMessages([])
    setErrorMessage(null)
    setFailedContent(null)
  }, [sessionUserId, conversationReady])

  return {
    messages,
    isWaiting,
    errorMessage,
    failedContent,
    conversationReady,
    submitMessage,
    retryFailedMessage,
    clearConversation,
  }
}

export default usePalayAssistant
