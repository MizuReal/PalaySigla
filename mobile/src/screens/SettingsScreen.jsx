// Settings tab — account-level controls cannot exist before sign-in, so the
// panel lists what Settings will hold once sessions land.
import FeatureNotice from '../components/FeatureNotice.jsx'
import TabScreen from '../components/TabScreen.jsx'

function SettingsScreen() {
  return (
    <TabScreen>
      <FeatureNotice
        eyebrow="Settings"
        title="Your account, your app."
        sub="Scans, listings, and preferences all hang off one PalaySigla account. Sign-in brings the switches that manage them."
        points={[
          'Account — profile, sign-in method, and sign-out',
          'Scan history — every result kept for your audit trail',
          'Notifications — harvest and marketplace alerts',
          'Data & privacy — what is stored and how it is used',
        ]}
        status="Account settings arrive with sign-in."
      />
    </TabScreen>
  )
}

export default SettingsScreen
