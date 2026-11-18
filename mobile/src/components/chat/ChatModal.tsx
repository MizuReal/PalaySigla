// Assistant chat bottom sheet — the phone-native equivalent of the website's
// chat widget panel: a canvas sheet floating above the tab bar over a light dim
// backdrop. While the keyboard is open the sheet anchors just above it. The
// root unmounts the sheet whenever it closes, so every open reloads the
// conversation from AsyncStorage. Sign-in is the gate: the modal only renders
// with a session.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import ChatBubble from './ChatBubble'
import ChatComposer from './ChatComposer'
import ChatErrorBanner from './ChatErrorBanner'
import {
  CHAT_BRAND_TILE_SIZE,
  CHAT_SHEET_BACKDROP_COLOR,
  CHAT_SHEET_ELEVATION,
  CHAT_SHEET_SHADOW_OPACITY,
  CHAT_SHEET_SHADOW_RADIUS,
  CHAT_SHEET_SIDE_GUTTER,
  chatSheetHeight,
} from './chatSheetLayout'
import TypingBubble from './TypingBubble'
import { useAuth } from '../../context/authContext'
import { useChatSheetBottomGap } from '../../hooks/useChatSheetBottomGap'
import usePalayAssistant, { MAX_MESSAGE_CHARS } from '../../hooks/usePalayAssistant'
import Icon from '../Icon'
import {
  BORDER_WIDTH,
  COLORS,
  RADIUS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const CLEAR_CONFIRM_RESET_MS = 4000

const WELCOME_TEXT =
  'Hello! Ako ang PalaySigla Assistant — nandito ako para sa mga tanong tungkol sa palay at bigas: ' +
  'quality assessment, pag-iimbak, pagpapatuyo, moisture, amag at peste, market grade, at iba pa. ' +
  'Ano ang gusto mong malaman?'

const SUGGESTED_QUESTIONS = Object.freeze([
  'Paano mag-imbak ng palay nang hindi nabubulok?',
  'Ano ang tamang moisture content ng tuyong palay?',
  'Paano malalaman kung may amag o bukbok ang bigas?',
])

interface WelcomeBubbleProps {
  onPick: (question: string) => void
}

function WelcomeBubble({ onPick }: WelcomeBubbleProps) {
  return (
    <View style={styles.welcomeBubble}>
      <Text style={[TYPE.bodySm, styles.welcomeText]}>{WELCOME_TEXT}</Text>
      <View style={styles.chipList}>
        {SUGGESTED_QUESTIONS.map((question) => (
          <Pressable
            key={question}
            onPress={() => onPick(question)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <Text style={[TYPE.bodySm, styles.chipText]}>{question}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

interface ChatSheetProps {
  onClose: () => void
  sheetHeight: number
}

function ChatSheet({ onClose, sheetHeight }: ChatSheetProps) {
  const { user } = useAuth()
  const {
    messages,
    isWaiting,
    errorMessage,
    failedContent,
    conversationReady,
    submitMessage,
    retryFailedMessage,
    clearConversation,
  } = usePalayAssistant(user?.id ?? null)

  const [draft, setDraft] = useState('')
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  const scrollRef = useRef<ScrollView | null>(null)
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetClearConfirmation = useCallback(() => {
    if (clearTimeoutRef.current !== null) {
      clearTimeout(clearTimeoutRef.current)
      clearTimeoutRef.current = null
    }
    setIsConfirmingClear(false)
  }, [])

  const handleClearPress = () => {
    if (isWaiting || messages.length === 0) {
      return
    }
    if (!isConfirmingClear) {
      setIsConfirmingClear(true)
      clearTimeoutRef.current = setTimeout(resetClearConfirmation, CLEAR_CONFIRM_RESET_MS)
      return
    }
    resetClearConfirmation()
    void clearConversation()
  }

  const handleSend = (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isWaiting || !conversationReady) {
      return
    }
    Keyboard.dismiss()
    setDraft('')
    void submitMessage(trimmed, messages)
  }

  const handlePickQuestion = (question: string) => {
    handleSend(question)
  }

  useEffect(() => {
    // mount-only: a pending clear-confirm timer must never fire after unmount
    return () => {
      if (clearTimeoutRef.current !== null) {
        clearTimeout(clearTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // keep the newest turn visible while a reply streams in
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [messages, isWaiting])

  const canSend = Boolean(conversationReady) && !isWaiting && draft.trim().length > 0

  return (
    <View style={[styles.sheet, { height: sheetHeight }]}>
      <View style={styles.sheetHeader}>
        <View style={styles.brandTile}>
          <Icon name="chat" size={20} color={COLORS.onPrimary} />
        </View>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={[TYPE.cardTitle, styles.titleText]}>
            PalaySigla Assistant
          </Text>
          <Text numberOfLines={1} style={[TYPE.captionSm, styles.subtitleText]}>
            Palay &amp; bigas lang ang sinasagot
          </Text>
        </View>
        {messages.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isConfirmingClear ? 'Confirm clear chat history' : 'Clear chat history'
            }
            disabled={isWaiting}
            onPress={handleClearPress}
            style={({ pressed }) => [
              styles.headerButton,
              isConfirmingClear && styles.clearConfirming,
              pressed && styles.pressedDim,
            ]}
          >
            <Icon
              name={isConfirmingClear ? 'check' : 'trash'}
              size={20}
              color={isConfirmingClear ? COLORS.error : COLORS.mute}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close chat"
          onPress={onClose}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressedDim]}
        >
          <Icon name="close" size={20} color={COLORS.mute} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        accessibilityLabel="Chat history"
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !isWaiting ? (
          <WelcomeBubble onPick={handlePickQuestion} />
        ) : (
          messages.map((message, index) => (
            <ChatBubble
              key={`${message.role}-${index}`}
              role={message.role}
              content={message.content}
            />
          ))
        )}
        {isWaiting ? <TypingBubble /> : null}
        {errorMessage ? (
          <ChatErrorBanner
            message={errorMessage}
            onRetry={failedContent !== null ? retryFailedMessage : undefined}
          />
        ) : null}
      </ScrollView>

      <ChatComposer
        value={draft}
        onChangeText={setDraft}
        onSend={() => handleSend(draft)}
        canSend={canSend}
        maxLength={MAX_MESSAGE_CHARS}
        placeholder="Tanong tungkol sa palay o bigas…"
      />
    </View>
  )
}

function ChatModal() {
  const { isChatOpen, closeChat, user } = useAuth()
  const { height: windowHeight } = useWindowDimensions()
  const bottomGap = useChatSheetBottomGap(isChatOpen && user !== null)

  if (!isChatOpen || !user) {
    return null
  }

  const sheetHeight = chatSheetHeight(windowHeight, bottomGap)

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={closeChat}>
      <View style={styles.overlay}>
        <Pressable
          onPress={closeChat}
          accessibilityRole="button"
          accessibilityLabel="Close chat"
          style={styles.backdrop}
        />
        <View style={[styles.sheetSlot, { bottom: bottomGap }]}>
          <ChatSheet
            key={user.id}
            onClose={closeChat}
            sheetHeight={sheetHeight}
          />
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    // RN 0.86 dropped absoluteFillObject; absoluteFill is the same plain object
    ...StyleSheet.absoluteFill,
    backgroundColor: CHAT_SHEET_BACKDROP_COLOR,
  },
  sheetSlot: {
    marginHorizontal: CHAT_SHEET_SIDE_GUTTER,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: CHAT_SHEET_SHADOW_OPACITY,
    shadowRadius: CHAT_SHEET_SHADOW_RADIUS,
    elevation: CHAT_SHEET_ELEVATION,
  },
  sheet: {
    backgroundColor: COLORS.canvas,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: BORDER_WIDTH.hairline,
    borderBottomColor: COLORS.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  brandTile: {
    width: CHAT_BRAND_TILE_SIZE,
    height: CHAT_BRAND_TILE_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  titleText: {
    color: COLORS.ink,
  },
  subtitleText: {
    color: COLORS.mute,
    marginTop: SPACING.xxs,
  },
  headerButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedDim: {
    opacity: 0.6,
  },
  clearConfirming: {
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.error,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
    flexGrow: 1,
  },
  welcomeBubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  welcomeText: {
    color: COLORS.ink,
  },
  chipList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  chipPressed: {
    borderColor: COLORS.primary,
  },
  chipText: {
    color: COLORS.ink,
  },
})

export default ChatModal
