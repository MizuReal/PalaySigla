// Bottom-tabs navigator over the four content destinations. Logout is NOT a
// route: AppTabBar renders it as an action cell beside Settings.
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import AppTabBar from '../components/AppTabBar.jsx'
import CommunityScreen from './CommunityScreen.jsx'
import MarketplaceScreen from './MarketplaceScreen.jsx'
import ScanScreen from './ScanScreen.jsx'
import SettingsScreen from './SettingsScreen.jsx'
import { COLORS } from '../theme/designTokens.js'

const Tab = createBottomTabNavigator()

function MainTabs() {
  return (
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
  )
}

export default MainTabs
