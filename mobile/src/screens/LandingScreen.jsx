// Content-only landing: introduces the product with the design-system
// surface rhythm. "Enter the app" hands off into the Marketplace tab of the
// shell (Main); the remaining entry points (scan, auth, marketplace flows)
// arrive in later phases — nothing else links anywhere yet.
import { useNavigation } from '@react-navigation/native'
import { ScrollView, StyleSheet } from 'react-native'
import BrandBar from '../components/BrandBar.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'
import AudienceSection from '../components/landing/AudienceSection.jsx'
import FeatureGrid from '../components/landing/FeatureGrid.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import LandingHero from '../components/landing/LandingHero.jsx'
import SampleScan from '../components/landing/SampleScan.jsx'
import { COLORS } from '../theme/designTokens.js'

const FIRST_TAB = { screen: 'Marketplace' }

function LandingScreen() {
  const navigation = useNavigation()

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
