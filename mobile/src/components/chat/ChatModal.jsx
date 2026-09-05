// Assistant chat bottom sheet — the phone-native equivalent of the website's
// chat widget panel: a canvas sheet floating above the tab bar (56px bar +
// bottom inset + 16px gap, side gutters ~ the web panel's right-6 width) over
// a light dim backdrop, level-3 soft shadow permitted as floating chrome.
// While the keyboard is open the sheet anchors 8px above it instead. The root
// unmounts the sheet whenever it closes, so every open reloads the
// conversation from AsyncStorage (same behavior as the web panel). Sign-in is
// the gate: the modal only renders with a session.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { TAB_BAR_HEIGHT } from '../AppTabBar.jsx'
import { useAuth } from '../../context/authContext.js'
import usePalayAssistant, { MAX_MESSAGE_CHARS } from '../../hooks/usePalayAssistant.js'
import usePulseOpacity from '../../hooks/usePulseOpacity.js'
import Icon from '../Icon.jsx'
import { BORDER_WIDTH, COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens.js'

const CLEAR_CONFIRM_RESET_MS = 4000
const SHEET_MAX_HEIGHT = 512
const SHEET_MIN_HEIGHT = 320
const SHEET_SIDE_GUTTER = SPACING.xl
// iOS modals do not resize for the keyboard (offset = keyboard height + air);
// Android's adjustResize already shrinks the window, so only a small gap is needed
const KEYBOARD_OPEN_BOTTOM_GAP_IOS = SPACING.sm
const KEYBOARD_OPEN_BOTTOM_GAP_ANDROID = SPACING.lg + SPACING.sm

const WELCOME_TEXT =
  'Hello! Ako ang PalaySigla Assistant — nandito ako para sa mga tanong tungkol sa palay at bigas: ' +
  'quality assessment, pag-iimbak, pagpapatuyo, moisture, amag at peste, market grade, at iba pa. ' +
  'Ano ang gusto mong malaman?'

const SUGGESTED_QUESTIONS = Object.freeze([
  'Paano mag-imbak ng palay nang hindi nabubulok?',
  'Ano ang tamang moisture content ng tuyong palay?',
  'Paano malalaman kung may amag o bukbok ang bigas?',
])

function TypingDot() {
  const opacity = usePulseOpacity()
  return <Animated.View style={[styles.typingDot, { opacity }]} />
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
        {message.content}
      </Text>
    </View>
  )
}

function WelcomeBubble({ onPick }) {
  return (
    <View style={[styles.bubble, styles.bubbleAssistant]}>
      <Text style={styles.bubbleTextAssistant}>{WELCOME_TEXT}</Text>
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

function ChatSheet({ onClose, bottomGap }) {
  const { user } = useAuth()
  const { height: windowHeight } = useWindowDimensions()
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
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [isConfirmingClear, setIsConfirmingClear] = useState(false)

  const scrollRef = useRef(null)
  const clearTimeoutRef = useRef(null)

  const sheetHeight = Math.min(
    SHEET_MAX_HEIGHT,
    Math.max(SHEET_MIN_HEIGHT, Math.round(windowHeight - bottomGap - SPACING.md))
  )

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

  const handleSend = (content) => {
    const trimmed = content.trim()
    if (!trimmed || isWaiting || !conversationReady) {
      return
    }
    Keyboard.dismiss()
    setDraft('')
    void submitMessage(trimmed, messages)
  }

  const handlePickQuestion = (question) => {
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
            <MessageBubble key={`${message.role}-${index}`} message={message} />
          ))
        )}
        {isWaiting ? (
          <View
            accessibilityRole="alert"
            accessibilityLabel="The assistant is typing"
            style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}
          >
            <TypingDot />
            <TypingDot />
            <TypingDot />
          </View>
        ) : null}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Icon name="info" size={20} color={COLORS.error} />
            <View style={styles.errorBody}>
              <Text style={[TYPE.bodySm, styles.errorText]}>{errorMessage}</Text>
              {failedContent !== null ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={retryFailedMessage}
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressedDim]}
                >
                  <Text style={[TYPE.bodyStrong, styles.retryText]}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composerRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          placeholder="Tanong tungkol sa palay o bigas…"
          placeholderTextColor={COLORS.mute}
          returnKeyType="send"
          onSubmitEditing={() => handleSend(draft)}
          blurOnSubmit={false}
          maxLength={MAX_MESSAGE_CHARS}
          accessibilityLabel="Message"
          style={[styles.input, isInputFocused && styles.inputFocused]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!canSend}
          onPress={() => handleSend(draft)}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
            pressed && canSend && styles.sendButtonPressed,
          ]}
        >
          <Icon name="send" size={20} color={canSend ? COLORS.onPrimary : COLORS.ash} />
        </Pressable>
      </View>
    </View>
  )
}

function ChatModal() {
  const { isChatOpen, closeChat, user } = useAuth()
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  // anchor the sheet above the tab bar, or above the keyboard while typing
  const bottomGap =
    keyboardHeight > 0
      ? Platform.OS === 'ios'
        ? keyboardHeight + KEYBOARD_OPEN_BOTTOM_GAP_IOS
        : KEYBOARD_OPEN_BOTTOM_GAP_ANDROID + insets.bottom
      : TAB_BAR_HEIGHT + insets.bottom + SPACING.lg

  useEffect(() => {
    if (!isChatOpen) {
      return undefined
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const handleShow = (event) => setKeyboardHeight(event.endCoordinates.height)
    const handleHide = () => setKeyboardHeight(0)
    const showSubscription = Keyboard.addListener(showEvent, handleShow)
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide)
    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [isChatOpen])

  if (!isChatOpen || !user) {
    return null
  }

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
          <ChatSheet key={user.id} onClose={closeChat} bottomGap={bottomGap} />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.35)',
  },
  sheetSlot: {
    marginHorizontal: SHEET_SIDE_GUTTER,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  sheet: {
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  brandTile: {
    width: 40,
    height: 40,
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedDim: {
    opacity: 0.6,
  },
  clearConfirming: {
    borderWidth: 1,
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
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  bubbleAssistant: {
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  bubbleTextUser: {
    ...TYPE.bodySm,
    color: COLORS.onPrimary,
  },
  bubbleTextAssistant: {
    ...TYPE.bodySm,
    color: COLORS.ink,
  },
  chipList: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
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
  typingBubble: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mute,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    alignSelf: 'stretch',
  },
  errorBody: {
    flex: 1,
  },
  errorText: {
    color: COLORS.ink,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingRight: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  retryText: {
    color: COLORS.primary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  inputFocused: {
    borderWidth: BORDER_WIDTH.focus,
    borderColor: COLORS.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.surfaceSoft,
  },
  sendButtonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
})

export default ChatModal
