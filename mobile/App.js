// App shell: typeface loading gate, then the landing screen in a native
// stack. Auth gating, tabs, and the remaining flows attach here in later
// phases; nothing renders until Inter is ready so the first paint never
// falls back to the system font.
// Subpath imports bundle only the 400/700 weights the token set uses —
// the package root would pull every Inter cut into the app.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import { DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import LandingScreen from './src/screens/LandingScreen.jsx'
import MainTabs from './src/screens/MainTabs.jsx'
import { COLORS } from './src/theme/designTokens.js'

const Stack = createNativeStackNavigator()

// light-only chrome: the stack background, cards, and text read from the
// canvas/ink tokens so no flash of the navigation default palette appears
const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.canvas,
    card: COLORS.canvas,
    text: COLORS.ink,
    border: COLORS.hairline,
    notification: COLORS.error,
  },
}

function RootNavigator() {
  return (
    <NavigationContainer theme={NAV_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  })

  // a font load failure must not hang the app: fall back to system glyphs
  // and render anyway
  if (!fontsLoaded && !fontError) {
    return null
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </SafeAreaProvider>
  )
}
