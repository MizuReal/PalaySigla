// Assessment advice state: one in-memory conversation per scan result. The
// opening analysis is generated automatically, the language preference is
// remembered per user, and a new photo resets everything. Conversation history
// is deliberately not persisted.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { sendAssessmentAdvice } from '../services/assessmentAdvice'
import type {
  AssessmentAdviceContext,
  AssessmentAdviceLanguage,
  AssessmentData,
  ChatTurn,
} from '../types/api'

export const MAX_ADVICE_MESSAGE_CHARS = 2000
export const MAX_ADVICE_HISTORY_MESSAGES = 20

const LANGUAGE_STORAGE_KEY_PREFIX = 'palaysigla:assessment-advice-language:'
const DEFAULT_LANGUAGE: AssessmentAdviceLanguage = 'english'
const OPENING_FAILED_MESSAGE = 'The analysis could not be completed. Please try again.'
const FOLLOW_UP_FAILED_MESSAGE = 'The assistant could not answer. Please try again.'
const MESSAGE_TOO_LONG_MESSAGE = 'That message is too long. Please shorten it and try again.'

export type AssessmentAdviceStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseAssessmentAdviceResult {
  language: AssessmentAdviceLanguage
  opening: string | null
  messages: ChatTurn[]
  status: AssessmentAdviceStatus
  isWaiting: boolean
  errorMessage: string | null
  failedContent: string | null
  hasFollowUps: boolean
  setLanguage: (language: AssessmentAdviceLanguage) => void
  submitMessage: (content: string) => Promise<void>
  retry: () => void
}

function languageStorageKey(userId: string): string {
  return `${LANGUAGE_STORAGE_KEY_PREFIX}${userId}`
}

function isAdviceLanguage(value: unknown): value is AssessmentAdviceLanguage {
  return value === 'english' || value === 'tagalog'
}

async function readStoredLanguage(
  userId: string | null | undefined
): Promise<AssessmentAdviceLanguage | null> {
  if (!userId) {
    return null
  }
  try {
    const stored = await AsyncStorage.getItem(languageStorageKey(userId))
    return isAdviceLanguage(stored) ? stored : null
  } catch {
    // a blocked store must not stop the analysis from loading
    return null
  }
}

async function writeStoredLanguage(
  userId: string,
  language: AssessmentAdviceLanguage
): Promise<void> {
  try {
    await AsyncStorage.setItem(languageStorageKey(userId), language)
  } catch {
    // preference is best-effort only
  }
}

function buildContext(assessment: AssessmentData): AssessmentAdviceContext {
  let highest: number | null = null
  let lowest: number | null = null
  for (const detection of assessment.detections) {
    if (highest === null || detection.confidence > highest) {
      highest = detection.confidence
    }
    if (lowest === null || detection.confidence < lowest) {
      lowest = detection.confidence
    }
  }
  return {
    defect_rate: assessment.defect_rate,
    counts: assessment.counts,
    highest_confidence: highest,
    lowest_confidence: lowest,
  }
}

function contextKey(context: AssessmentAdviceContext): string {
  const counts = Object.keys(context.counts)
    .sort()
    .map((key) => `${key}:${context.counts[key]}`)
    .join(',')
  return [
    context.defect_rate,
    counts,
    context.highest_confidence ?? '',
    context.lowest_confidence ?? '',
  ].join('|')
}

function useAssessmentAdvice(
  assessment: AssessmentData | null,
  sessionUserId: string | null | undefined
): UseAssessmentAdviceResult {
  const [language, setLanguageState] = useState<AssessmentAdviceLanguage>(DEFAULT_LANGUAGE)
  const [languageOwnerId, setLanguageOwnerId] = useState<string | null>(null)
  const [languageLoaded, setLanguageLoaded] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [status, setStatus] = useState<AssessmentAdviceStatus>('idle')
  const [isWaiting, setIsWaiting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [failedContent, setFailedContent] = useState<string | null>(null)

  const isWaitingRef = useRef(false)
  const requestIdRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const openingCacheRef = useRef(new Map<string, string>())
  const lastAssessmentKeyRef = useRef<string | null>(null)

  const context = useMemo(
    () => (assessment ? buildContext(assessment) : null),
    [assessment]
  )
  const assessmentKey = useMemo(
    () => (context ? contextKey(context) : ''),
    [context]
  )
  const hasFollowUps = messages.some((turn) => turn.role === 'user')
  const languageReady =
    languageLoaded && languageOwnerId === (sessionUserId ?? null)

  useEffect(() => {
    let isCurrent = true
    const load = async () => {
      const stored = await readStoredLanguage(sessionUserId)
      if (isCurrent) {
        setLanguageState(stored ?? DEFAULT_LANGUAGE)
        setLanguageOwnerId(sessionUserId ?? null)
        setLanguageLoaded(true)
      }
    }
    void load()
    return () => {
      isCurrent = false
    }
  }, [sessionUserId])

  useEffect(() => {
    // a different account must never see the previous account's cached advice
    openingCacheRef.current.clear()
    abortRef.current?.abort()
    requestIdRef.current += 1
  }, [sessionUserId])

  useEffect(() => {
    return () => {
      // mount-only cleanup: a pending advice request must not update an unmounted screen
      abortRef.current?.abort()
      requestIdRef.current += 1
    }
  }, [])

  const beginRequest = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    requestIdRef.current += 1
    return { requestId: requestIdRef.current, signal: controller.signal }
  }, [])

  const loadOpening = useCallback(
    async (
      targetContext: AssessmentAdviceContext,
      targetLanguage: AssessmentAdviceLanguage,
      targetKey: string
    ) => {
      const cacheKey = `${targetKey}:${targetLanguage}`
      const cached = openingCacheRef.current.get(cacheKey)
      if (cached) {
        abortRef.current?.abort()
        requestIdRef.current += 1
        setOpening(cached)
        setMessages([{ role: 'assistant', content: cached }])
        setStatus('ready')
        setErrorMessage(null)
        setFailedContent(null)
        return
      }

      const { requestId, signal } = beginRequest()
      isWaitingRef.current = false
      setIsWaiting(false)
      setOpening(null)
      setMessages([])
      setStatus('loading')
      setErrorMessage(null)
      setFailedContent(null)
      try {
        const { reply } = await sendAssessmentAdvice(
          {
            assessment: targetContext,
            messages: [],
            language: targetLanguage,
          },
          signal
        )
        if (requestIdRef.current !== requestId) {
          return
        }
        openingCacheRef.current.set(cacheKey, reply)
        setOpening(reply)
        setMessages([{ role: 'assistant', content: reply }])
        setStatus('ready')
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return
        }
        setErrorMessage(
          error instanceof Error ? error.message : OPENING_FAILED_MESSAGE
        )
        setStatus('error')
      }
    },
    [beginRequest]
  )

  useEffect(() => {
    if (!context || !languageReady) {
      return
    }
    if (lastAssessmentKeyRef.current !== assessmentKey) {
      lastAssessmentKeyRef.current = assessmentKey
      openingCacheRef.current.clear()
    }
    void loadOpening(context, language, assessmentKey)
  }, [assessmentKey, context, language, languageReady, loadOpening])

  useEffect(() => {
    if (context) {
      return
    }
    abortRef.current?.abort()
    requestIdRef.current += 1
    lastAssessmentKeyRef.current = null
    openingCacheRef.current.clear()
    isWaitingRef.current = false
  }, [context])

  const sendTurn = useCallback(
    async (content: string, baseMessages: ChatTurn[]) => {
      const trimmed = content.trim()
      if (!trimmed || !context || isWaitingRef.current) {
        return
      }
      if (trimmed.length > MAX_ADVICE_MESSAGE_CHARS) {
        setErrorMessage(MESSAGE_TOO_LONG_MESSAGE)
        return
      }

      const userTurn: ChatTurn = { role: 'user', content: trimmed }
      const nextMessages = [...baseMessages, userTurn].slice(-MAX_ADVICE_HISTORY_MESSAGES)
      const { requestId, signal } = beginRequest()
      setMessages(nextMessages)
      setErrorMessage(null)
      setFailedContent(null)
      isWaitingRef.current = true
      setIsWaiting(true)
      try {
        const { reply } = await sendAssessmentAdvice(
          {
            assessment: context,
            messages: nextMessages,
            language,
          },
          signal
        )
        if (requestIdRef.current !== requestId) {
          return
        }
        const assistantTurn: ChatTurn = { role: 'assistant', content: reply }
        setMessages(
          [...nextMessages, assistantTurn].slice(-MAX_ADVICE_HISTORY_MESSAGES)
        )
      } catch (error) {
        if (requestIdRef.current !== requestId) {
          return
        }
        setFailedContent(trimmed)
        setErrorMessage(
          error instanceof Error ? error.message : FOLLOW_UP_FAILED_MESSAGE
        )
      } finally {
        if (requestIdRef.current === requestId) {
          isWaitingRef.current = false
          setIsWaiting(false)
        }
      }
    },
    [beginRequest, context, language]
  )

  const submitMessage = useCallback(
    async (content: string) => {
      if (status !== 'ready') {
        return
      }
      await sendTurn(content, messages)
    },
    [messages, sendTurn, status]
  )

  const retry = useCallback(() => {
    if (failedContent !== null) {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        const turn = messages[index]
        if (turn.role === 'user' && turn.content === failedContent) {
          void sendTurn(failedContent, messages.slice(0, index))
          return
        }
      }
      return
    }
    if (status === 'error' && context) {
      void loadOpening(context, language, assessmentKey)
    }
  }, [
    assessmentKey,
    context,
    failedContent,
    language,
    loadOpening,
    messages,
    sendTurn,
    status,
  ])

  const setLanguage = useCallback(
    (next: AssessmentAdviceLanguage) => {
      if (next === language || hasFollowUps) {
        return
      }
      setLanguageState(next)
      if (sessionUserId) {
        void writeStoredLanguage(sessionUserId, next)
      }
    },
    [hasFollowUps, language, sessionUserId]
  )

  const hasContext = context !== null
  return {
    language: hasContext ? language : DEFAULT_LANGUAGE,
    opening: hasContext ? opening : null,
    messages: hasContext ? messages : [],
    status: hasContext ? status : 'idle',
    isWaiting: hasContext ? isWaiting : false,
    errorMessage: hasContext ? errorMessage : null,
    failedContent: hasContext ? failedContent : null,
    hasFollowUps: hasContext ? hasFollowUps : false,
    setLanguage,
    submitMessage,
    retry,
  }
}

export default useAssessmentAdvice
