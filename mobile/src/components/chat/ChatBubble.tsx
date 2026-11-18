// Shared assistant message bubble. User turns use the primary fill; assistant
// turns use the soft surface with a hairline rule, matching the web widget.
import { StyleSheet, Text, View } from 'react-native'
import type { ChatTurn } from '../../types/api'
import { BORDER_WIDTH, COLORS, SPACING, TYPE } from '../../theme/designTokens'

interface ChatBubbleProps {
  role: ChatTurn['role']
  content: string
}

function ChatBubble({ role, content }: ChatBubbleProps) {
  const isUser = role === 'user'
  return (
    <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
      <Text style={isUser ? styles.textUser : styles.textAssistant}>{content}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
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
  textUser: {
    ...TYPE.bodySm,
    color: COLORS.onPrimary,
  },
  textAssistant: {
    ...TYPE.bodySm,
    color: COLORS.ink,
  },
})

export default ChatBubble
