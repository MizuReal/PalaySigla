// Unknown-address fallback — the web NotFoundPage's mobile equivalent, used as
// the target for unhandled navigation/deep links.
import { Pressable, StyleSheet, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import FullPageMessage from '../components/FullPageMessage'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

type NotFoundScreenProps = NativeStackScreenProps<RootStackParamList, 'NotFound'>

function NotFoundScreen({ navigation }: NotFoundScreenProps) {
  return (
    <FullPageMessage
      title="Page not found."
      message="That address doesn't lead anywhere on PalaySigla. Check the link, or jump to a page that does."
    >
      <Button
        label="Go to Marketplace"
        onPress={() => navigation.navigate('Main', { screen: 'Marketplace' })}
        fullWidth
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('Landing')}
        style={({ pressed }) => [styles.outline, pressed && styles.pressed]}
      >
        <Text style={[TYPE.buttonMd, styles.outlineLabel]}>Back to home</Text>
      </Pressable>
    </FullPageMessage>
  )
}

const styles = StyleSheet.create({
  outline: {
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
  },
  outlineLabel: {
    color: COLORS.ink,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default NotFoundScreen
