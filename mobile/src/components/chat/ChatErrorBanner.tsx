// Shared failure banner for assistant surfaces. A failed turn must never be
// silent, and retry stays a 44px target.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import {
  BORDER_WIDTH,
  COLORS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

interface ChatErrorBannerProps {
  message: string
  onRetry?: () => void
}

function ChatErrorBanner({ message, onRetry }: ChatErrorBannerProps) {
  return (
    <View style={styles.banner}>
      <Icon name="info" size={20} color={COLORS.error} />
      <View style={styles.body}>
        <Text style={[TYPE.bodySm, styles.text]}>{message}</Text>
        {onRetry ? (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={[TYPE.bodyStrong, styles.retryText]}>Try again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    alignSelf: 'stretch',
  },
  body: {
    flex: 1,
  },
  text: {
    color: COLORS.ink,
  },
  retry: {
    alignSelf: 'flex-start',
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingRight: SPACING.sm,
    marginTop: SPACING.xxs,
  },
  pressed: {
    opacity: 0.6,
  },
  retryText: {
    color: COLORS.primary,
  },
})

export default ChatErrorBanner
