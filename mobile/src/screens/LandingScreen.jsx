// Content-only landing: introduces the product with the design-system
// surface rhythm. Interactive entry points (scan, auth, marketplace) land in
// later phases — nothing here links anywhere yet.
import { ScrollView, StyleSheet } from 'react-native'
import BrandBar from '../components/BrandBar.jsx'
import LandingFooter from '../components/landing/LandingFooter.jsx'
import AudienceSection from '../components/landing/AudienceSection.jsx'
import FeatureGrid from '../components/landing/FeatureGrid.jsx'
import HowItWorks from '../components/landing/HowItWorks.jsx'
import LandingHero from '../components/landing/LandingHero.jsx'
import SampleScan from '../components/landing/SampleScan.jsx'
import { COLORS } from '../theme/designTokens.js'

function LandingScreen() {
  return (
    <ScrollView style={styles.screen}>
      <BrandBar />
      <LandingHero />
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
