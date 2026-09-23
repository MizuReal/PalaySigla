// A single discussion thread — the web ForumThreadModal ported to a full-screen
// root-stack push: the post (author, category, body, photos, heart, owner
// Edit/Delete) over an oldest-first comment list with a composer. Mutations
// broadcast on the forum event so the feed and counts refresh behind it.
import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import AuthorBadge from '../components/forum/AuthorBadge'
import CommentComposer from '../components/forum/CommentComposer'
import CommentItem from '../components/forum/CommentItem'
import DeleteInlineConfirm from '../components/forum/DeleteInlineConfirm'
import ForumPostImage from '../components/forum/ForumPostImage'
import HeartButton from '../components/forum/HeartButton'
import Icon from '../components/Icon'
import { AUTH_MODAL_MODES, useAuth } from '../context/authContext'
import { softDeleteForumPost } from '../services/forum'
import { FORUM_CATEGORY_LABELS } from '../utils/forumCategories'
import { notifyForumChanged, subscribeToForumChanged } from '../utils/forumEvents'
import useForumComments from '../hooks/useForumComments'
import useForumPost from '../hooks/useForumPost'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { RootStackParamList } from '../types/navigation'

type ForumThreadScreenProps = NativeStackScreenProps<RootStackParamList, 'ForumThread'>

function ForumThreadScreen({ route, navigation }: ForumThreadScreenProps) {
  const { postId } = route.params
  const insets = useSafeAreaInsets()
  const { user, openAuthModal } = useAuth()
  const {
    post,
    isLoading: isPostLoading,
    error: postError,
    refresh: refreshPost,
  } = useForumPost(postId)
  const {
    comments,
    total,
    isInitialLoading,
    isLoadingMore,
    error: commentsError,
    loadMore,
    refresh: refreshComments,
    hasMore,
  } = useForumComments(postId)
  const [actionError, setActionError] = useState('')
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    return subscribeToForumChanged(() => {
      refreshPost()
      refreshComments()
    })
  }, [refreshPost, refreshComments])

  const requireSignIn = () => openAuthModal(AUTH_MODAL_MODES.LOGIN)

  const handleDeletePost = async () => {
    setIsDeleting(true)
    try {
      await softDeleteForumPost(postId)
      notifyForumChanged()
      navigation.goBack()
    } catch (err) {
      setIsDeleting(false)
      setIsConfirmingDelete(false)
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not remove the discussion. Please try again.'
      )
    }
  }

  const isOwner = user !== null && post !== null && user.id === post.user_id

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.topBarRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => navigation.goBack()}
            hitSlop={SPACING.sm}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Icon name="chevron-left" size={24} color={COLORS.ink} />
          </Pressable>
          <Text style={[TYPE.captionMd, styles.topBarLabel]}>Community</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isPostLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : postError || !post ? (
          <View style={styles.centered}>
            <Text accessibilityRole="alert" style={[TYPE.bodyStrong, styles.centeredText]}>
              {postError || 'That discussion could not be found.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={refreshPost}
              style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
            >
              <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <AuthorBadge
              name={post.author_name}
              timestamp={post.created_at}
              isEdited={post.updated_at !== null}
            />
            <View style={styles.chip}>
              <Text style={[TYPE.captionSm, styles.chipText]}>
                {FORUM_CATEGORY_LABELS[post.category]}
              </Text>
            </View>
            <Text style={[TYPE.headingLg, styles.title]}>{post.title}</Text>
            <Text style={[TYPE.bodyMd, styles.body]}>{post.body}</Text>
            {post.forum_images.map((image) => (
              <ForumPostImage
                key={image.id}
                image={image}
                alt={post.title}
                style={styles.photo}
              />
            ))}

            {actionError ? (
              <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.actionError]}>
                {actionError}
              </Text>
            ) : null}

            <View style={styles.postActions}>
              <HeartButton
                postId={post.id}
                hearted={post.hasHearted}
                count={post.heart_count}
                onRequireSignIn={requireSignIn}
                onChanged={refreshPost}
                onError={setActionError}
              />
              {isOwner ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => navigation.navigate('ForumPostEditor', { postId: post.id })}
                    style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
                  >
                    <Text style={[TYPE.buttonSm, styles.textActionLabel]}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsConfirmingDelete(true)}
                    style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}
                  >
                    <Text style={[TYPE.buttonSm, styles.deleteLabel]}>Delete</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            {isConfirmingDelete ? (
              <DeleteInlineConfirm
                prompt="Remove this discussion permanently?"
                confirmLabel="Yes, remove it"
                pendingLabel="Removing…"
                isPending={isDeleting}
                onConfirm={handleDeletePost}
                onCancel={() => setIsConfirmingDelete(false)}
              />
            ) : null}

            <View style={styles.commentsHeader}>
              <Text style={[TYPE.headingSm, styles.commentsTitle]}>
                {total === 1 ? '1 comment' : `${total} comments`}
              </Text>
            </View>

            {isInitialLoading ? (
              <ActivityIndicator color={COLORS.primary} style={styles.commentsSpinner} />
            ) : commentsError ? (
              <View style={styles.centered}>
                <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.centeredText]}>
                  {commentsError}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={refreshComments}
                  style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
                >
                  <Text style={[TYPE.buttonSm, styles.retryLabel]}>Try again</Text>
                </Pressable>
              </View>
            ) : comments.length === 0 ? (
              <Text style={[TYPE.bodySm, styles.emptyComments]}>
                No comments yet. Be the first to reply.
              </Text>
            ) : (
              comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onChanged={refreshComments}
                  onRequireSignIn={requireSignIn}
                  onError={setActionError}
                />
              ))
            )}

            {hasMore ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoadingMore }}
                disabled={isLoadingMore}
                onPress={loadMore}
                style={({ pressed }) => [
                  styles.loadMore,
                  isLoadingMore && styles.disabled,
                  pressed && !isLoadingMore && styles.pressed,
                ]}
              >
                <Text style={[TYPE.buttonSm, styles.loadMoreLabel]}>
                  {isLoadingMore ? 'Loading more…' : 'Load more comments'}
                </Text>
              </Pressable>
            ) : null}

            <View style={styles.composer}>
              <CommentComposer
                postId={postId}
                onPosted={() => {
                  refreshComments()
                  notifyForumChanged()
                }}
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarLabel: {
    color: COLORS.mute,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  centeredText: {
    color: COLORS.ink,
    textAlign: 'center',
  },
  retry: {
    minHeight: TOUCH_TARGET,
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
  chip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.primary,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.md,
  },
  body: {
    color: COLORS.body,
    marginTop: SPACING.md,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginTop: SPACING.md,
  },
  actionError: {
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    paddingTop: SPACING.lg,
  },
  textAction: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
  },
  textActionLabel: {
    color: COLORS.mute,
  },
  deleteLabel: {
    color: COLORS.error,
  },
  commentsHeader: {
    marginTop: SPACING.xxl,
    marginBottom: SPACING.sm,
  },
  commentsTitle: {
    color: COLORS.ink,
  },
  commentsSpinner: {
    marginTop: SPACING.lg,
  },
  emptyComments: {
    color: COLORS.mute,
    marginTop: SPACING.sm,
  },
  loadMore: {
    minHeight: TOUCH_TARGET,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  loadMoreLabel: {
    color: COLORS.ink,
  },
  composer: {
    marginTop: SPACING.xl,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.6,
  },
})

export default ForumThreadScreen
