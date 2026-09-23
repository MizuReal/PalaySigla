// One discussion in the feed — a compact author line, the title paired with
// its category tag, a 3-line description, a full-width 4:3 first photo when
// present, and a footer of exactly two buttons: the heart and the reply count.
// The whole card opens the thread; the footer buttons are isolated targets.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import AuthorBadge from './AuthorBadge'
import ForumPostImage from './ForumPostImage'
import HeartButton from './HeartButton'
import ReplyButton from './ReplyButton'
import { FORUM_CATEGORY_LABELS } from '../../utils/forumCategories'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'
import type { ForumPostSummary } from '../../types/domain'

const PHOTO_ASPECT_RATIO = 4 / 3

interface ForumPostCardProps {
  post: ForumPostSummary
  onSelect: (post: ForumPostSummary) => void
  onRequireSignIn: () => void
  onChanged?: () => void
  onError?: (message: string) => void
}

function ForumPostCard({
  post,
  onSelect,
  onRequireSignIn,
  onChanged,
  onError,
}: ForumPostCardProps) {
  const firstImage = post.forum_images?.[0]
  const isEdited = post.updated_at !== null

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={post.title}
      onPress={() => onSelect(post)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <AuthorBadge
        name={post.author_name}
        timestamp={post.created_at}
        isEdited={isEdited}
      />
      <View style={styles.headerRow}>
        <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={2}>
          {post.title}
        </Text>
        <View style={styles.chip}>
          <Text style={[TYPE.captionSm, styles.chipText]}>
            {FORUM_CATEGORY_LABELS[post.category]}
          </Text>
        </View>
      </View>
      <Text style={[TYPE.bodySm, styles.description]} numberOfLines={3}>
        {post.body}
      </Text>
      {firstImage ? (
        <ForumPostImage
          image={firstImage}
          alt={post.title}
          style={styles.photo}
        />
      ) : null}
      <View style={styles.footer}>
        <HeartButton
          postId={post.id}
          hearted={post.hasHearted}
          count={post.heart_count}
          onRequireSignIn={onRequireSignIn}
          onChanged={onChanged}
          onError={onError}
        />
        <ReplyButton count={post.comment_count} onPress={() => onSelect(post)} />
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.lg,
    alignSelf: 'stretch',
  },
  cardPressed: {
    borderColor: COLORS.primary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  title: {
    flex: 1,
    color: COLORS.ink,
  },
  chip: {
    flexShrink: 0,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  chipText: {
    color: COLORS.primary,
  },
  description: {
    color: COLORS.body,
    marginTop: SPACING.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: PHOTO_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    marginTop: SPACING.md,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
})

export default ForumPostCard
