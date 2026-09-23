// Post/comment author line — the web AuthorBadge ported to phones: a 32px
// initials monogram (the {rounded.full} avatar exception; others' profile
// photos stay private under RLS), the author name, the relative time, and an
// optional "· edited" marker.
import { StyleSheet, Text, View } from 'react-native'
import { formatRelativeTime } from '../../utils/format'
import { getInitials } from '../../utils/userProfile'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const AVATAR_SIZE = 32

interface AuthorBadgeProps {
  name: string
  timestamp: string
  isEdited?: boolean
}

function AuthorBadge({ name, timestamp, isEdited = false }: AuthorBadgeProps) {
  return (
    <View style={styles.row}>
      <View style={styles.avatar} accessible={false}>
        <Text style={[TYPE.captionSm, styles.initials]}>{getInitials(name)}</Text>
      </View>
      <Text style={[TYPE.bodyStrong, styles.name]} numberOfLines={1}>
        {name}
        <Text style={[TYPE.captionSm, styles.meta]}>
          {'  '}
          {formatRelativeTime(timestamp)}
          {isEdited ? ' · edited' : ''}
        </Text>
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.mute,
  },
  name: {
    flex: 1,
    color: COLORS.ink,
  },
  meta: {
    color: COLORS.mute,
  },
})

export default AuthorBadge
