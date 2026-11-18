// Full assessment advice conversation. The opening analysis is already in the
// transcript; this sheet adds follow-up turns and the composer. History lives
// only in the hook's memory for the current scan.
import { useEffect, useRef, useState } from 'react'
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
import AssessmentAdviceLanguageToggle from './AssessmentAdviceLanguageToggle'
import ChatBubble from '../chat/ChatBubble'
import ChatComposer from '../chat/ChatComposer'
import ChatErrorBanner from '../chat/ChatErrorBanner'
import TypingBubble from '../chat/TypingBubble'
import {
  CHAT_BRAND_TILE_SIZE,
  CHAT_SHEET_BACKDROP_COLOR,
  CHAT_SHEET_ELEVATION,
  CHAT_SHEET_SHADOW_OPACITY,
  CHAT_SHEET_SHADOW_RADIUS,
  CHAT_SHEET_SIDE_GUTTER,
  chatSheetHeight,
} from '../chat/chatSheetLayout'
import { useChatSheetBottomGap } from '../../hooks/useChatSheetBottomGap'
import type { UseAssessmentAdviceResult } from '../../hooks/useAssessmentAdvice'
import { MAX_ADVICE_MESSAGE_CHARS } from '../../hooks/useAssessmentAdvice'
import type {
  AssessmentAdviceLanguage,
  AssessmentData,
  AssessmentQuality,
  AssessmentSeverity,
} from '../../types/api'
import Icon from '../Icon'
import {
  BORDER_WIDTH,
  COLORS,
  RADIUS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const DISCLAIMER = 'AI guidance based on this scan. Not a laboratory result.'
const LOADING_LABEL = 'Analyzing this result…'
const COMPOSER_PLACEHOLDER = 'Magtanong tungkol sa resultang ito…'

const QUALITY_LABELS: Record<AssessmentQuality, string> = {
  premium: 'Premium',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

const SEVERITY_LABELS: Record<AssessmentSeverity, string> = {
  none: 'Clear',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
}

const STARTER_QUESTIONS: Record<AssessmentAdviceLanguage, readonly string[]> = {
  english: [
    'How do I prevent mold during storage?',
    'What moisture should I reach before storing?',
    'How should I store this batch?',
  ],
  tagalog: [
    'Paano ko maiiwasan ang amag sa imbakan?',
    'Anong moisture bago mag-imbak?',
    'Paano ko ito iimbak nang maayos?',
  ],
}

interface AssessmentAdviceSheetProps {
  visible: boolean
  onClose: () => void
  assessment: AssessmentData
  advice: UseAssessmentAdviceResult
}

function summaryLine(assessment: AssessmentData): string {
  const count = assessment.detections.length
  const noun = count === 1 ? 'area' : 'areas'
  const severity =
    assessment.severity === 'none'
      ? SEVERITY_LABELS[assessment.severity]
      : `${SEVERITY_LABELS[assessment.severity]} severity`
  return `${QUALITY_LABELS[assessment.quality_status]} · ${severity} · ${count} flagged ${noun}`
}

function AssessmentAdviceSheet({
  visible,
  onClose,
  assessment,
  advice,
}: AssessmentAdviceSheetProps) {
  const { height: windowHeight } = useWindowDimensions()
  const bottomGap = useChatSheetBottomGap(visible)
  const sheetHeight = chatSheetHeight(windowHeight, bottomGap)
  const [draft, setDraft] = useState('')
  const scrollRef = useRef<ScrollView | null>(null)

  useEffect(() => {
    if (!visible) {
      return
    }
    scrollRef.current?.scrollToEnd({ animated: true })
  }, [advice.messages, advice.isWaiting, visible])

  const handleClose = () => {
    setDraft('')
    onClose()
  }

  const canSubmit = advice.status === 'ready' && !advice.isWaiting
  const canSend = canSubmit && draft.trim().length > 0

  const handleSend = (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || !canSubmit) {
      return
    }
    Keyboard.dismiss()
    setDraft('')
    void advice.submitMessage(trimmed)
  }

  const starterQuestions = STARTER_QUESTIONS[advice.language]
  const showStarters =
    advice.status === 'ready' &&
    advice.messages.length > 0 &&
    !advice.hasFollowUps

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close analysis"
          style={styles.backdrop}
        />
        <View style={[styles.sheetSlot, { bottom: bottomGap }]}>
          <View
            style={[styles.sheet, { height: sheetHeight }]}
            accessibilityViewIsModal
          >
            <View style={styles.header}>
              <View style={styles.brandTile}>
                <Icon name="chat" size={20} color={COLORS.onPrimary} />
              </View>
              <View style={styles.titleBlock}>
                <Text numberOfLines={1} style={[TYPE.cardTitle, styles.titleText]}>
                  PalaySigla Assistant
                </Text>
                <Text numberOfLines={1} style={[TYPE.captionSm, styles.subtitleText]}>
                  {summaryLine(assessment)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close analysis"
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressedDim,
                ]}
              >
                <Icon name="close" size={20} color={COLORS.mute} />
              </Pressable>
            </View>

            <Text style={[TYPE.captionSm, styles.disclaimer]}>{DISCLAIMER}</Text>

            <ScrollView
              ref={scrollRef}
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              accessibilityLabel="Analysis conversation"
              keyboardShouldPersistTaps="handled"
            >
              {advice.hasFollowUps ? null : (
                <View style={styles.languageRow}>
                  <AssessmentAdviceLanguageToggle
                    value={advice.language}
                    onChange={advice.setLanguage}
                    disabled={advice.status === 'loading'}
                  />
                </View>
              )}

              {advice.status === 'loading' ? (
                <View style={styles.loading}>
                  <TypingBubble />
                  <Text style={[TYPE.captionSm, styles.loadingText]}>
                    {LOADING_LABEL}
                  </Text>
                </View>
              ) : null}

              {advice.messages.map((message, index) => (
                <ChatBubble
                  key={`${message.role}-${index}`}
                  role={message.role}
                  content={message.content}
                />
              ))}

              {advice.isWaiting ? <TypingBubble /> : null}

              {advice.errorMessage ? (
                <ChatErrorBanner
                  message={advice.errorMessage}
                  onRetry={
                    advice.status === 'error' || advice.failedContent !== null
                      ? advice.retry
                      : undefined
                  }
                />
              ) : null}

              {showStarters ? (
                <View style={styles.chips}>
                  {starterQuestions.map((question) => (
                    <Pressable
                      key={question}
                      accessibilityRole="button"
                      onPress={() => handleSend(question)}
                      style={({ pressed }) => [
                        styles.chip,
                        pressed && styles.chipPressed,
                      ]}
                    >
                      <Text style={[TYPE.bodySm, styles.chipText]}>{question}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            <ChatComposer
              value={draft}
              onChangeText={setDraft}
              onSend={() => handleSend(draft)}
              canSend={canSend}
              maxLength={MAX_ADVICE_MESSAGE_CHARS}
              placeholder={COMPOSER_PLACEHOLDER}
            />
          </View>
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
  header: {
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
  disclaimer: {
    color: COLORS.mute,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
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
  languageRow: {
    alignItems: 'flex-start',
  },
  loading: {
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.mute,
  },
  chips: {
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

export default AssessmentAdviceSheet
