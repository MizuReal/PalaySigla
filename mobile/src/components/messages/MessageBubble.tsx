import { StyleSheet, Text, View } from 'react-native'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'
import type { ThreadMessage } from '../../hooks/useConversation'

const TIME_FORMAT: Intl.DateTimeFormatOptions = Object.freeze({
  hour: 'numeric',
  minute: '2-digit',
})

function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString('en-PH', TIME_FORMAT)
}

interface MessageBubbleProps {
  message: ThreadMessage
  isViewer: boolean
}

function MessageBubble({ message, isViewer }: MessageBubbleProps) {
  return (
    <View style={[styles.row, isViewer ? styles.rowViewer : styles.rowOther]}>
      <View style={[styles.bubble, isViewer ? styles.bubbleViewer : styles.bubbleOther]}>
        <Text style={[TYPE.bodyMd, isViewer ? styles.bodyViewer : styles.bodyOther]}>
          {message.body}
        </Text>
        <Text
          style={[
            TYPE.captionXs,
            styles.timestamp,
            isViewer ? styles.timestampViewer : styles.timestampOther,
          ]}
        >
          {message.pending ? 'Sending…' : formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  rowViewer: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  bubbleViewer: {
    backgroundColor: COLORS.primary,
  },
  bubbleOther: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  bodyViewer: {
    color: COLORS.onPrimary,
  },
  bodyOther: {
    color: COLORS.ink,
  },
  timestamp: {
    marginTop: SPACING.xs,
    textAlign: 'right',
  },
  timestampViewer: {
    color: COLORS.onPrimary,
    opacity: 0.8,
  },
  timestampOther: {
    color: COLORS.mute,
  },
})

export default MessageBubble
