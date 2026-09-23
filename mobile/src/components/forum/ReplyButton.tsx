// Reply affordance for a feed card — a 44px hairline button pairing the chat
// glyph with the reply count, matching the HeartButton geometry. The parent
// supplies onPress (opening the thread).
import { Pressable, StyleSheet, Text } from 'react-native'
import Icon from '../Icon'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

const REPLY_ICON_SIZE = 18

interface ReplyButtonProps {
  count: number
  onPress: () => void
}

function ReplyButton({ count, onPress }: ReplyButtonProps) {
  const label = count === 1 ? '1 reply' : `${count} replies`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${label}`}
      onPress={onPress}
      hitSlop={SPACING.sm}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Icon name="chat" size={REPLY_ICON_SIZE} color={COLORS.mute} />
      <Text style={[TYPE.captionSm, styles.count]}>{count}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  pressed: {
    opacity: 0.6,
  },
  count: {
    color: COLORS.mute,
  },
})

export default ReplyButton
