// App shell: typeface loading gate, then the landing screen in a native
// stack. The sign-in dialog and assistant chat bottom sheet mount at the
// root beside the navigator (mirroring the website's AppModals + ChatWidget)
// so they overlay every screen natively; nothing renders until Inter is ready
// so the first paint never falls back to the system font.
// Subpath imports bundle only the 400/700 weights the token set uses —
// the package root would pull every Inter cut into the app.
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'
import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native'
import type { Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts } from 'expo-font'
import { StatusBar } from 'expo-status-bar'
import { ErrorBoundary } from 'react-error-boundary'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import AuthModal from './src/components/AuthModal'
import AuthToasts from './src/components/AuthToasts'
import ChatModal from './src/components/chat/ChatModal'
import ProfileNudgeModal from './src/components/ProfileNudgeModal'
import RootErrorFallback from './src/components/RootErrorFallback'
import AuthProvider from './src/context/AuthProvider'
import MessagingProvider from './src/context/MessagingProvider'
import ToastProvider from './src/context/ToastProvider'
import LandingScreen from './src/screens/LandingScreen'
import ConversationScreen from './src/screens/ConversationScreen'
import FarmerProfileScreen from './src/screens/FarmerProfileScreen'
import ForumPostEditorScreen from './src/screens/ForumPostEditorScreen'
import ForumThreadScreen from './src/screens/ForumThreadScreen'
import ListingDetailScreen from './src/screens/ListingDetailScreen'
import MainTabs from './src/screens/MainTabs'
import MessagesScreen from './src/screens/MessagesScreen'
import NotFoundScreen from './src/screens/NotFoundScreen'
import PostListingScreen from './src/screens/PostListingScreen'
import ReviewFormScreen from './src/screens/ReviewFormScreen'
import { COLORS } from './src/theme/designTokens'
import type { RootStackParamList } from './src/types/navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()

const navigationRef = createNavigationContainerRef<RootStackParamList>()

// light-only chrome: the stack background, cards, and text read from the
// canvas/ink tokens so no flash of the navigation default palette appears
const NAV_THEME: Theme = {
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
    <NavigationContainer ref={navigationRef} theme={NAV_THEME}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
        <Stack.Screen name="PostListing" component={PostListingScreen} />
        <Stack.Screen name="Messages" component={MessagesScreen} />
        <Stack.Screen name="Conversation" component={ConversationScreen} />
        <Stack.Screen name="ReviewForm" component={ReviewFormScreen} />
        <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
        <Stack.Screen name="ForumPostEditor" component={ForumPostEditorScreen} />
        <Stack.Screen name="FarmerProfile" component={FarmerProfileScreen} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
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
      <AuthProvider>
        <MessagingProvider>
          <ToastProvider>
            <ErrorBoundary
              FallbackComponent={RootErrorFallback}
              onError={(error) => {
                // diagnostics belong in the console; the UI never leaks details
                console.error('Unhandled app error:', error)
              }}
            >
              <RootNavigator />
              <AuthModal />
              <ChatModal />
              <AuthToasts />
              <ProfileNudgeModal
                onOpenProfile={() => {
                  if (navigationRef.isReady()) {
                    navigationRef.navigate('Main', {
                      screen: 'Settings',
                      params: { tab: 'farmer' },
                    })
                  }
                }}
              />
            </ErrorBoundary>
          </ToastProvider>
        </MessagingProvider>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
