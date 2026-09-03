// Community tab — an exchange between growers and mills is planned, not
// built; this panel describes it without faking posts or members.
import FeatureNotice from '../components/FeatureNotice.jsx'
import TabScreen from '../components/TabScreen.jsx'

function CommunityScreen() {
  return (
    <TabScreen>
      <FeatureNotice
        eyebrow="Community"
        title="Growers talking to mills."
        sub="A shared space for the people behind each harvest — field notes, variety talk, and the services both sides rely on."
        points={[
          'Share harvest photos, variety notes, and drying updates',
          'Find mill services and buy-and-sell partners nearby',
          'Exchange plain-language quality insights from scans',
        ]}
        status="The community feed arrives in a later phase."
      />
    </TabScreen>
  )
}

export default CommunityScreen
