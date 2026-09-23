// Community tab — the live forum feed (port of the web /forum): a hero with
// "Start a discussion", the collapsible category band, the search/pill filter
// toolbar, and the paginated discussion list. A keyed remount on filter change
// resets pagination; the listings-style event subscription refreshes counts and
// feed after any post/comment/heart mutation.
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { CompositeScreenProps } from '@react-navigation/native'
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import BrandBar from '../components/BrandBar'
import Button from '../components/Button'
import ForumCategorySection from '../components/forum/ForumCategorySection'
import ForumFilters from '../components/forum/ForumFilters'
import ForumPostCard from '../components/forum/ForumPostCard'
import ForumPostCardSkeleton from '../components/forum/ForumPostCardSkeleton'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import useForumCategoryCounts from '../hooks/useForumCategoryCounts'
import useForumPosts from '../hooks/useForumPosts'
import { subscribeToForumChanged } from '../utils/forumEvents'
import type { ForumCategory } from '../utils/forumCategories'
import type { ForumPostSummary } from '../types/domain'
import type { MainTabParamList, RootStackParamList } from '../types/navigation'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens'

const SEARCH_DEBOUNCE_MS = 350
const SKELETON_COUNT = 4

type CommunityScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Community'>,
  NativeStackScreenProps<RootStackParamList>
>

interface FeedProps {
  category: ForumCategory | null
  search: string
  onSelectPost: (post: ForumPostSummary) => void
  onRequireSignIn: () => void
  onRetry: () => void
}

function ForumFeed({
  category,
  search,
  onSelectPost,
  onRequireSignIn,
  onRetry,
}: FeedProps) {
  const {
    posts,
    isInitialLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore,
  } = useForumPosts({ category, search })
  const [actionError, setActionError] = useState('')

  const hasActiveFilters = category !== null || search !== ''

  const renderEmpty = () => {
    if (isInitialLoading) {
      return (
        <>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <ForumPostCardSkeleton key={index} />
          ))}
        </>
      )
    }
    if (error) {
      return (
        <View style={[styles.panel, styles.errorPanel]}>
          <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.errorText]}>
            {error}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
          >
            <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
          </Pressable>
        </View>
      )
    }
    return (
      <View style={[styles.panel, styles.emptyPanel]}>
        <Text style={[TYPE.headingSm, styles.emptyTitle]}>No discussions yet.</Text>
        <Text style={[TYPE.bodySm, styles.emptySub]}>
          {hasActiveFilters
            ? 'Nothing matches those filters right now. Try widening the search.'
            : 'Be the first to start a conversation with the community.'}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.feed}>
      {actionError ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.actionError]}>
          {actionError}
        </Text>
      ) : null}
      <FlatList<ForumPostSummary>
        data={isInitialLoading || error ? [] : posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ForumPostCard
            post={item}
            onSelect={onSelectPost}
            onRequireSignIn={onRequireSignIn}
            onChanged={() => setActionError('')}
            onError={setActionError}
          />
        )}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : null
        }
        onEndReached={() => {
          if (hasMore && !isLoadingMore && !isInitialLoading && !error) {
            loadMore()
          }
        }}
        onEndReachedThreshold={0.4}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  )
}

function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { user, openAuthModal } = useAuth()
  const [category, setCategory] = useState<ForumCategory | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [refreshNonce, setRefreshNonce] = useState(0)

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchInput.trim()),
      SEARCH_DEBOUNCE_MS
    )
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    return subscribeToForumChanged(() => {
      setRefreshNonce((current) => current + 1)
    })
  }, [])

  const { counts, isLoading: areCountsLoading, error: countsError, retry } =
    useForumCategoryCounts(refreshNonce)

  const requireSignIn = () => openAuthModal(AUTH_MODAL_MODES.LOGIN)

  const handleStartDiscussion = () => {
    if (user) {
      navigation.navigate('ForumPostEditor')
      return
    }
    requireSignIn()
  }

  const handleSelectPost = (post: ForumPostSummary) => {
    navigation.navigate('ForumThread', { postId: post.id })
  }

  return (
    <View style={styles.screen}>
      <BrandBar />
      <View style={styles.hero}>
        <Text style={[TYPE.captionMd, styles.eyebrow]}>Community</Text>
        <Text style={[TYPE.headingXl, styles.title]}>
          Growers talking to mills.
        </Text>
        <Text style={[TYPE.bodyMd, styles.sub]}>
          Field notes, variety talk, and the services both sides rely on.
        </Text>
        <View style={styles.cta}>
          <Button label="Start a discussion" onPress={handleStartDiscussion} fullWidth />
        </View>
      </View>
      <ForumCategorySection
        activeCategory={category}
        counts={counts}
        isLoading={areCountsLoading}
        error={countsError}
        onSelect={(next) => setCategory((current) => (current === next ? null : next))}
        onRetry={retry}
      />
      <ForumFilters
        category={category}
        counts={counts}
        search={searchInput}
        onCategoryChange={setCategory}
        onSearchChange={setSearchInput}
      />
      <ForumFeed
        key={`${category ?? 'all'}|${search}|${refreshNonce}`}
        category={category}
        search={search}
        onSelectPost={handleSelectPost}
        onRequireSignIn={requireSignIn}
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
  hero: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  sub: {
    color: COLORS.body,
    marginTop: SPACING.sm,
  },
  cta: {
    alignSelf: 'stretch',
    marginTop: SPACING.lg,
  },
  feed: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
    flexGrow: 1,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  panel: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  errorPanel: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
  },
  errorText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptyPanel: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  emptyTitle: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  emptySub: {
    color: COLORS.mute,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  retryLabel: {
    color: COLORS.ink,
  },
  actionError: {
    color: COLORS.error,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.md,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default CommunityScreen
