// One discussion in the feed — author line, category chip, title, a 3-line
// excerpt, the first photo as a 4:3 thumbnail when present, and a footer with
// the heart plus a reply count. The whole card opens the thread; the heart is
// its own press target.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import AuthorBadge from './AuthorBadge'
import ForumPostImage from './ForumPostImage'
import HeartButton from './HeartButton'
import { FORUM_CATEGORY_LABELS } from '../../utils/forumCategories'
import { COLORS, SPACING, TYPE } from '../../theme/designTokens'
import type { ForumPostSummary } from '../../types/domain'

const THUMB_WIDTH = 96
const THUMB_ASPECT_RATIO = 4 / 3

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
      <View style={styles.chip}>
        <Text style={[TYPE.captionSm, styles.chipText]}>
          {FORUM_CATEGORY_LABELS[post.category]}
        </Text>
      </View>
      <Text style={[TYPE.cardTitle, styles.title]} numberOfLines={2}>
        {post.title}
      </Text>
      <View style={styles.bodyRow}>
        {firstImage ? (
          <ForumPostImage
            image={firstImage}
            alt={post.title}
            style={styles.thumb}
          />
        ) : null}
        <Text style={[TYPE.bodySm, styles.excerpt]} numberOfLines={3}>
          {post.body}
        </Text>
      </View>
      <View style={styles.footer}>
        <HeartButton
          postId={post.id}
          hearted={post.hasHearted}
          count={post.heart_count}
          onRequireSignIn={onRequireSignIn}
          onChanged={onChanged}
          onError={onError}
        />
        <Text style={[TYPE.captionSm, styles.replies]}>
          {post.comment_count === 1
            ? '1 reply'
            : `${post.comment_count} replies`}
        </Text>
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
  chip: {
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
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
    marginTop: SPACING.sm,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  thumb: {
    width: THUMB_WIDTH,
    aspectRatio: THUMB_ASPECT_RATIO,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  excerpt: {
    flex: 1,
    color: COLORS.body,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  replies: {
    color: COLORS.mute,
  },
})

export default ForumPostCard
