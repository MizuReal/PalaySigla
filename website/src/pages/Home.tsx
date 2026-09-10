import AudienceSection from '../components/site/AudienceSection.jsx'
import CtaStrip from '../components/site/CtaStrip.jsx'
import FeatureGrid from '../components/site/FeatureGrid.jsx'
import Footer from '../components/site/Footer.jsx'
import HeroCarousel from '../components/site/HeroCarousel.jsx'
import HowItWorks from '../components/site/HowItWorks.jsx'
import OutputMockup from '../components/site/OutputMockup.jsx'
import PrimaryNav from '../components/site/PrimaryNav.jsx'

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
