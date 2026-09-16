import AudienceSection from '../components/site/AudienceSection'
import CtaStrip from '../components/site/CtaStrip'
import FeatureGrid from '../components/site/FeatureGrid'
import Footer from '../components/site/Footer'
import HeroCarousel from '../components/site/HeroCarousel'
import HowItWorks from '../components/site/HowItWorks'
import OutputMockup from '../components/site/OutputMockup'
import PrimaryNav from '../components/site/PrimaryNav'

function Home() {
  return (
    <>
      <PrimaryNav />
      <main>
        <HeroCarousel />
        <OutputMockup />
        <FeatureGrid />
        <HowItWorks />
        <AudienceSection />
        <CtaStrip />
      </main>
      <Footer />
    </>
  )
}

export default Home
