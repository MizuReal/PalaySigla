import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Icon from '../Icon'
import { MESSAGE_MAX_CHARS } from '../../services/messaging'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface MessageComposerProps {
  onSend: (body: string) => void
  isSending: boolean
  error: string
}

function MessageComposer({ onSend, isSending, error }: MessageComposerProps) {
  const [value, setValue] = useState('')
  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !isSending

  const handleSend = () => {
    if (!canSend) {
      return
    }
    onSend(trimmed)
    setValue('')
  }

  return (
    <View style={styles.wrap}>
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.error]}>
          {error}
        </Text>
      ) : null}
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={setValue}
          maxLength={MESSAGE_MAX_CHARS}
          placeholder="Write a message…"
          placeholderTextColor={COLORS.stone}
          accessibilityLabel="Message"
          multiline
          style={[TYPE.bodyMd, styles.input]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend }}
          disabled={!canSend}
          onPress={handleSend}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend && styles.sendDisabled,
            pressed && canSend && styles.sendPressed,
          ]}
        >
          <Icon name="send" size={20} color={canSend ? COLORS.onPrimary : COLORS.ash} />
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  error: {
    color: COLORS.error,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.md,
  },
  input: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    color: COLORS.ink,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sendButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
  },
  sendDisabled: {
    backgroundColor: COLORS.surfaceSoft,
  },
  sendPressed: {
    backgroundColor: COLORS.primaryDark,
  },
})

export default MessageComposer
