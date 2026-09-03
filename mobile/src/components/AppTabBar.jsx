// Custom bottom tab bar per DESIGN.md chrome rules: canvas bar, 1px hairline
// top rule, zero elevation, 56px body (the sub-nav-strip height) plus the
// bottom safe-area inset. Cells: four navigable tabs + one action cell
// (Logout) that never navigates — it confirms and resets the root stack to
// the Landing intro, which is the signed-out state until auth lands.
//
// The center Scan cell renders as a raised 48px `{colors.primary}` square
// with a black camera glyph, the signature hero slot of a photo-first app.
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from './Icon.jsx'
import { COLORS, RADIUS, SPACING, TYPE } from '../theme/designTokens.js'

const ICON_SIZE = 22
const ACTIVE_INDICATOR_SIZE = 4
const SCAN_BUTTON_SIZE = 48
const SCAN_BUTTON_RAISE = 20
const BAR_HEIGHT = 56

// route names double as the React keys of the mapped cells below
const TAB_CELLS = [
  { route: 'Marketplace', label: 'Marketplace', icon: 'marketplace' },
  { route: 'Community', label: 'Community', icon: 'community' },
  { route: 'Scan', label: 'Scan', icon: 'camera', raised: true },
  { route: 'Settings', label: 'Settings', icon: 'settings' },
]

function Cell({
  icon,
  label,
  isActive,
  raised,
  onPress,
  accessibilityRole,
  accessibilityState,
}) {
  const content = (
    <View style={styles.cellContent}>
      {raised ? (
        <View style={styles.scanButton}>
          <Icon name={icon} size={24} color={COLORS.onPrimary} />
        </View>
      ) : (
        <>
          <Icon
            name={icon}
            size={ICON_SIZE}
            color={isActive ? COLORS.primary : COLORS.stone}
          />
          {isActive ? (
            <>
              <Text
                style={[TYPE.captionXs, styles.activeLabel]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {label}
              </Text>
              <View style={styles.activeIndicator} accessible={false} />
            </>
          ) : null}
        </>
      )}
    </View>
  )

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={label}
      accessibilityState={accessibilityState}
      style={styles.cell}
    >
      {content}
    </Pressable>
  )
}

function AppTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets()

  const handleLogoutPress = () => {
    Alert.alert(
      'Sign out of PalaySigla?',
      'You\u2019ll return to the intro screen. Your account and scans stay on this device until a real session exists.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => {
            // signed-out state today = back to the Landing intro; a session
            // signOut call slots in here once auth exists
            navigation.getParent()?.reset({
              index: 0,
              routes: [{ name: 'Landing' }],
            })
          },
        },
      ]
    )
  }

  const handleScanPress = () => {
    navigation.navigate('Scan')
  }

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: insets.bottom, height: BAR_HEIGHT + insets.bottom },
      ]}
    >
      <View style={styles.cellRow}>
        {TAB_CELLS.map((cell) => {
          const isActive =
            state.index ===
            state.routes.findIndex((route) => route.name === cell.route)
          return (
            <Cell
              key={cell.route}
              icon={cell.icon}
              label={cell.label}
              raised={cell.raised}
              isActive={isActive}
              onPress={
                cell.route === 'Scan'
                  ? handleScanPress
                  : () => navigation.navigate(cell.route)
              }
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            />
          )
        })}
        <Cell
          icon="logout"
          label="Logout"
          onPress={handleLogoutPress}
          accessibilityRole="button"
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: COLORS.canvas,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  cellRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: BAR_HEIGHT,
    overflow: 'visible',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: BAR_HEIGHT,
    overflow: 'visible',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanButton: {
    width: SCAN_BUTTON_SIZE,
    height: SCAN_BUTTON_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SCAN_BUTTON_RAISE,
  },
  activeLabel: {
    color: COLORS.ink,
    marginTop: SPACING.xs,
  },
  activeIndicator: {
    width: ACTIVE_INDICATOR_SIZE,
    height: ACTIVE_INDICATOR_SIZE,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    marginTop: SPACING.xxs,
  },
})

export default AppTabBar
