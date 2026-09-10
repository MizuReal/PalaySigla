import { Link } from 'react-router-dom'
import { pillTabClasses } from '../../utils/pillTab.js'
import { PROFILE_TAB_IDS } from '../../utils/profileTabs.js'
import type { ProfileTabId } from '../../utils/profileTabs.js'

interface ProfileTab {
  id: ProfileTabId
  label: string
  to: string
}

const TABS: readonly ProfileTab[] = Object.freeze([
  { id: PROFILE_TAB_IDS.ACCOUNT, label: 'Account', to: '/profile' },
  {
    id: PROFILE_TAB_IDS.LISTINGS,
    label: 'Selling history',
    to: `/profile?tab=${PROFILE_TAB_IDS.LISTINGS}`,
  },
])

interface ProfileTabsProps {
  activeTab: ProfileTabId
}

function ProfileTabs({ activeTab }: ProfileTabsProps) {
  return (
    <nav aria-label="Profile sections" className="flex flex-wrap gap-2">
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <Link
            key={tab.id}
            to={tab.to}
            aria-current={isActive ? 'page' : undefined}
            className={pillTabClasses(isActive)}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default ProfileTabs
