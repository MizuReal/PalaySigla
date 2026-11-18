// Shared 44px composer used by the floating assistant and the assessment advice
// sheet. The parent owns the draft so starter chips can fill the same field.
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import Icon from '../Icon'
import {
  BORDER_WIDTH,
  COLORS,
  RADIUS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

interface ChatComposerProps {
  value: string
  onChangeText: (text: string) => void
  onSend: () => void
  canSend: boolean
  maxLength: number
  placeholder: string
}

function ChatComposer({
  value,
  onChangeText,
  onSend,
  canSend,
  maxLength,
  placeholder,
}: ChatComposerProps) {
  const [isFocused, setIsFocused] = useState(false)
  return (
    <View style={styles.row}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mute}
        returnKeyType="send"
        onSubmitEditing={onSend}
        blurOnSubmit={false}
        maxLength={maxLength}
        accessibilityLabel="Message"
        style={[styles.input, isFocused && styles.inputFocused]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Send message"
        disabled={!canSend}
        onPress={onSend}
        style={({ pressed }) => [
          styles.sendButton,
          !canSend && styles.sendButtonDisabled,
          pressed && canSend && styles.sendButtonPressed,
        ]}
      >
        <Icon name="send" size={20} color={canSend ? COLORS.onPrimary : COLORS.ash} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
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
    minHeight: TOUCH_TARGET,
    borderWidth: BORDER_WIDTH.hairline,
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
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
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

export default ChatComposer
