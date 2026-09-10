// Content-only landing: introduces the product with the design-system
// surface rhythm. "Enter the app" hands off into the Marketplace tab of the
// shell (Main); the remaining entry points (scan, auth, marketplace flows)
// arrive in later phases — nothing else links anywhere yet.
import { useNavigation } from '@react-navigation/native'
import type { NavigatorScreenParams } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScrollView, StyleSheet } from 'react-native'
import BrandBar from '../components/BrandBar'
import LandingFooter from '../components/landing/LandingFooter'
import AudienceSection from '../components/landing/AudienceSection'
import FeatureGrid from '../components/landing/FeatureGrid'
import HowItWorks from '../components/landing/HowItWorks'
import LandingHero from '../components/landing/LandingHero'
import SampleScan from '../components/landing/SampleScan'
import { COLORS } from '../theme/designTokens'
import type { MainTabParamList, RootStackParamList } from '../types/navigation'

const FIRST_TAB: NavigatorScreenParams<MainTabParamList> = { screen: 'Marketplace' }

function LandingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()

  const handleGetStarted = () => {
    navigation.navigate('Main', FIRST_TAB)
  }

  return (
    <ScrollView style={styles.screen}>
      <BrandBar />
      <LandingHero onGetStarted={handleGetStarted} />
      <SampleScan />
      <FeatureGrid />
      <HowItWorks />
      <AudienceSection />
      <LandingFooter />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
})

export default LandingScreen
