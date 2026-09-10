// Bottom-tabs navigator over the four content destinations. Login/Logout is
// NOT a route: AppTabBar renders it as an always-present action cell beside
// Settings so the bar stays at five even cells. The chat launcher floats
// above the tab bar on every tab; chat itself is the root-level ChatModal
// mounted in App.tsx beside the auth dialog.
import { StyleSheet, View } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AppTabBar from '../components/AppTabBar'
import ChatLauncher from '../components/chat/ChatLauncher'
import CommunityScreen from './CommunityScreen'
import MarketplaceScreen from './MarketplaceScreen'
import ScanScreen from './ScanScreen'
import SettingsScreen from './SettingsScreen'
import { COLORS } from '../theme/designTokens'
import type { MainTabParamList } from '../types/navigation'

const Tab = createBottomTabNavigator<MainTabParamList>()

function MainTabs() {
  return (
    <View style={styles.shell}>
      <Tab.Navigator
        tabBar={(props) => <AppTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: COLORS.canvas },
        }}
      >
        <Tab.Screen name="Marketplace" component={MarketplaceScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Scan" component={ScanScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      <ChatLauncher />
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
})

export default MainTabs
