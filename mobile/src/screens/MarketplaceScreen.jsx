// Marketplace tab — the live browse feed. Signed-out users can read every
// active listing (RLS allows public select of non-deleted rows); posting
// and owner management need an account, so the Post CTA explains honestly
// that sign-in ships with the next phase instead of opening a dead form.
import { useEffect, useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import BrandBar from '../components/BrandBar.jsx'
import ListingFeed from '../components/marketplace/ListingFeed.jsx'
import ListingFilters from '../components/marketplace/ListingFilters.jsx'
import { LISTING_SORTS } from '../services/listings.js'
import { COLORS } from '../theme/designTokens.js'

const SEARCH_DEBOUNCE_MS = 350

function MarketplaceScreen({ navigation }) {
  const [category, setCategory] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(LISTING_SORTS.NEWEST)
  const [refreshNonce, setRefreshNonce] = useState(0)

  // debounce keystrokes so the feed only refetches after typing pauses
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [searchInput])

  // remounting the feed on any filter change resets it to page 1 with a
  // fresh loading state (matches the web marketplace's keyed feed)
  const feedKey = `${category ?? 'all'}|${search}|${sort}|${refreshNonce}`

  const handlePostPress = () => {
    Alert.alert(
      'Posting comes with sign-in',
      'Posting a listing needs a PalaySigla account. Sign-in and posting ship together in the next phase — until then, every active listing stays open to browse here.'
    )
  }

  const handleSelectListing = (listing) => {
    // ListingDetail lives on the root stack above the tabs, so the action
    // bubbles up from the tab navigator and pushes over the tab bar —
    // mirroring the web's full-screen detail modal.
    navigation.navigate('ListingDetail', { listingId: listing.id })
  }

  return (
    <View style={styles.screen}>
      <BrandBar />
      <ListingFilters
        category={category}
        search={searchInput}
        sort={sort}
        onCategoryChange={setCategory}
        onSearchChange={setSearchInput}
        onSortChange={setSort}
      />
      <ListingFeed
        key={feedKey}
        category={category}
        search={search}
        sort={sort}
        onSelectListing={handleSelectListing}
        onPostPress={handlePostPress}
        onRetry={() => setRefreshNonce((current) => current + 1)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
})

export default MarketplaceScreen
