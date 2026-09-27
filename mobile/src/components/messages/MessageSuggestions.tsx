import { Pressable, StyleSheet, Text, View } from 'react-native'
import { INQUIRY_SUGGESTIONS } from '../../utils/messageSuggestions'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

interface MessageSuggestionsProps {
  onSelect: (text: string) => void
  disabled?: boolean
}

// Buyer opener chips shown on an empty listing thread; tapping one sends the
// question as the first message.
function MessageSuggestions({ onSelect, disabled = false }: MessageSuggestionsProps) {
  return (
    <View style={styles.list}>
      {INQUIRY_SUGGESTIONS.map((suggestion) => (
        <Pressable
          key={suggestion}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => onSelect(suggestion)}
          style={({ pressed }) => [
            styles.chip,
            disabled && styles.chipDisabled,
            pressed && !disabled && styles.chipPressed,
          ]}
        >
          <Text style={[TYPE.bodySm, styles.chipText, disabled && styles.chipTextDisabled]}>
            {suggestion}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  chip: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  chipPressed: {
    borderColor: COLORS.primary,
  },
  chipDisabled: {
    borderColor: COLORS.hairline,
  },
  chipText: {
    color: COLORS.ink,
  },
  chipTextDisabled: {
    color: COLORS.ash,
  },
})

export default MessageSuggestions
