// Marketplace tab — the live browse feed. Signed-out users can read every
// active listing (RLS allows public select of non-deleted rows); posting
// needs an account, so the Post CTA opens the auth dialog (web parity: once
// signed in, the user taps Post again). Any listing mutation elsewhere in the
// app refreshes the keyed feed through the listings-changed event.
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BrandBar from '../components/BrandBar'
import ListingFeed from '../components/marketplace/ListingFeed'
import ListingFilters from '../components/marketplace/ListingFilters'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { LISTING_SORTS } from '../services/listings'
import type { ListingCategory, ListingSort } from '../services/listings'
import { subscribeToListingsChanged } from '../utils/listingEvents'
import type { ListingWithImages } from '../types/domain'
import type { MainTabParamList, RootStackParamList } from '../types/navigation'
import { COLORS } from '../theme/designTokens'

const SEARCH_DEBOUNCE_MS = 350

type MarketplaceScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Marketplace'>,
  NativeStackScreenProps<RootStackParamList>
>

function MarketplaceScreen({ navigation }: MarketplaceScreenProps) {
  const { user, openAuthModal } = useAuth()
  const [category, setCategory] = useState<ListingCategory | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<ListingSort>(LISTING_SORTS.NEWEST)
  const [refreshNonce, setRefreshNonce] = useState(0)

  // debounce keystrokes so the feed only refetches after typing pauses
  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [searchInput])

  // subscribe once for the lifetime of the tab: a post or owner action
  // anywhere in the app remounts the keyed feed with fresh data
  useEffect(() => {
    return subscribeToListingsChanged(() => {
      setRefreshNonce((current) => current + 1)
    })
  }, [])

  // remounting the feed on any filter change resets it to page 1 with a
  // fresh loading state (matches the web marketplace's keyed feed)
  const feedKey = `${category ?? 'all'}|${search}|${sort}|${refreshNonce}`

  const handlePostPress = () => {
    if (user) {
      navigation.navigate('PostListing')
      return
    }
    openAuthModal(AUTH_MODAL_MODES.LOGIN)
  }

  const handleSelectListing = (listing: ListingWithImages) => {
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
