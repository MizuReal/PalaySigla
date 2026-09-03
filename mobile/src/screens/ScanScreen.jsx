// Scan tab — the product's core act. The camera flow and inference are not
// wired yet, so the panel states the four checks a scan will return rather
// than faking a capture experience.
import FeatureNotice from '../components/FeatureNotice.jsx'
import TabScreen from '../components/TabScreen.jsx'

function ScanScreen() {
  return (
    <TabScreen>
      <FeatureNotice
        eyebrow="Scan"
        title="Point. Shoot. Assess."
        sub="One photo of harvested paddy returns every quality answer at once — consistent, objective, and kept on record."
        points={[
          'Quality status — fresh, dry, or deteriorating',
          'Mold detection — caught before it spreads',
          'Market grade — consistent from sack to sack',
          'Variety classification — verified at the gate',
        ]}
        status="Camera capture and model inference arrive in the scan phase."
      />
    </TabScreen>
  )
}

export default ScanScreen
