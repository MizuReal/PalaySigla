// Top chrome strip: the green brand square + wordmark on canvas with a
// hairline rule, matching the light-only deviation (no dark nav). Signed-in
// users get a right-aligned inbox affordance with a live unread badge; it
// navigates to the root-level Messages screen.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from './Icon'
import { useAuth } from '../context/authContext'
import useUnreadMessageCount from '../hooks/useUnreadMessageCount'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

const MAX_BADGE_COUNT = 9

function BrandBar() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const unreadTotal = useUnreadMessageCount()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const badgeLabel = unreadTotal > MAX_BADGE_COUNT ? '9+' : String(unreadTotal)

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + SPACING.md, paddingBottom: SPACING.md },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.brand} accessibilityLabel="PalaySigla">
          <View style={styles.brandSquare} accessible={false} />
          <Text style={[TYPE.bodyStrong, styles.brandName]}>PalaySigla</Text>
        </View>
        {user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadTotal > 0 ? `Messages, ${unreadTotal} unread` : 'Messages'
            }
            onPress={() => navigation.navigate('Messages')}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.inboxButton, pressed && styles.pressed]}
          >
            <Icon name="chat" size={22} color={COLORS.ink} />
            {unreadTotal > 0 ? (
              <View style={styles.badge}>
                <Text style={[TYPE.captionXs, styles.badgeText]}>{badgeLabel}</Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.canvas,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingHorizontal: GUTTER,
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  brandSquare: {
    width: 12,
    height: 12,
    backgroundColor: COLORS.primary,
  },
  brandName: {
    color: COLORS.ink,
  },
  inboxButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  badge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xs,
  },
  badgeText: {
    color: COLORS.onPrimary,
  },
})

export default BrandBar
