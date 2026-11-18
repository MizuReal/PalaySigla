// Inline AI analysis shown automatically with a scan result. The full opening
// analysis stays visible; tapping the box opens the conversation sheet.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import AssessmentAdviceLanguageToggle from './AssessmentAdviceLanguageToggle'
import ChatErrorBanner from '../chat/ChatErrorBanner'
import TypingBubble from '../chat/TypingBubble'
import type { AssessmentAdviceStatus } from '../../hooks/useAssessmentAdvice'
import type { AssessmentAdviceLanguage } from '../../types/api'
import Icon from '../Icon'
import {
  BORDER_WIDTH,
  COLORS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const PANEL_LABEL = 'AI analysis'
const DISCLAIMER = 'AI guidance based on this scan. Not a laboratory result.'
const OPEN_HINT = 'Opens the conversation so you can ask a follow-up.'
const FOLLOW_UP_LABEL = 'Ask a follow-up'
const LOADING_LABEL = 'Analyzing this result…'

interface AssessmentAdvicePanelProps {
  opening: string | null
  status: AssessmentAdviceStatus
  errorMessage: string | null
  language: AssessmentAdviceLanguage
  hasFollowUps: boolean
  onLanguageChange: (language: AssessmentAdviceLanguage) => void
  onOpen: () => void
  onRetry: () => void
}

function AssessmentAdvicePanel({
  opening,
  status,
  errorMessage,
  language,
  hasFollowUps,
  onLanguageChange,
  onOpen,
  onRetry,
}: AssessmentAdvicePanelProps) {
  if (status === 'idle') {
    return null
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[TYPE.captionMd, styles.eyebrow]}>{PANEL_LABEL}</Text>
        {hasFollowUps ? null : (
          <AssessmentAdviceLanguageToggle
            value={language}
            onChange={onLanguageChange}
            disabled={status === 'loading'}
          />
        )}
      </View>

      {status === 'loading' ? (
        <View style={styles.loading}>
          <TypingBubble />
          <Text style={[TYPE.captionSm, styles.loadingText]}>{LOADING_LABEL}</Text>
        </View>
      ) : null}

      {status === 'error' && errorMessage ? (
        <View style={styles.error}>
          <ChatErrorBanner message={errorMessage} onRetry={onRetry} />
        </View>
      ) : null}

      {status === 'ready' && opening ? (
        <>
          <Pressable
            onPress={onOpen}
            accessibilityRole="button"
            accessibilityLabel={`${PANEL_LABEL}. ${opening}`}
            accessibilityHint={OPEN_HINT}
            style={({ pressed }) => [styles.body, pressed && styles.bodyPressed]}
          >
            <Text style={[TYPE.bodySm, styles.adviceText]}>{opening}</Text>
            <View style={styles.footer}>
              <Icon name="chat" size={20} color={COLORS.primary} />
              <Text style={[TYPE.bodyStrong, styles.footerText]}>{FOLLOW_UP_LABEL}</Text>
              <Icon name="chevron-right" size={20} color={COLORS.primary} />
            </View>
          </Pressable>
          <Text style={[TYPE.captionSm, styles.disclaimer]}>{DISCLAIMER}</Text>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.sm,
    paddingTop: SPACING.xs,
    borderBottomWidth: BORDER_WIDTH.hairline,
    borderBottomColor: COLORS.hairline,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  loading: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    color: COLORS.mute,
  },
  error: {
    padding: SPACING.lg,
  },
  body: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  bodyPressed: {
    backgroundColor: COLORS.canvas,
  },
  adviceText: {
    color: COLORS.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: TOUCH_TARGET,
    marginTop: SPACING.md,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.hairline,
  },
  footerText: {
    flex: 1,
    color: COLORS.primary,
  },
  disclaimer: {
    color: COLORS.mute,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
})

export default AssessmentAdvicePanel
