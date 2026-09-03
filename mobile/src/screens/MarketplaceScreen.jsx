// Marketplace tab — the mobile marketplace is not built yet; this panel
// states what it will offer without faking data or dead controls.
import FeatureNotice from '../components/FeatureNotice.jsx'
import TabScreen from '../components/TabScreen.jsx'

function MarketplaceScreen() {
  return (
    <TabScreen>
      <FeatureNotice
        eyebrow="Marketplace"
        title="The trading floor, in your pocket."
        sub="Farmers and mills buy and sell palay, rice, seeds, and machinery — every listing photographed and pinned to a map."
        points={[
          'Browse active listings with photos, price, unit, and location',
          'Post a listing with a photo and a map-pinned pickup point',
          'Manage your own listings — mark sold or remove them',
        ]}
        status="The mobile marketplace ships in the next phase."
      />
    </TabScreen>
  )
}

export default MarketplaceScreen
