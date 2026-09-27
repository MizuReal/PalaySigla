// Monogram circle per the {rounded.full} avatar exception in DESIGN.md. Names
// are snapshotted onto conversations (profiles stay private under RLS), so the
// initials are the only stable identity cue available here.
import { StyleSheet, Text, View } from 'react-native'
import { getInitials } from '../utils/userProfile'
import { COLORS, RADIUS, TYPE } from '../theme/designTokens'

const DEFAULT_SIZE = 40

interface AvatarProps {
  name: string
  size?: number
}

function Avatar({ name, size = DEFAULT_SIZE }: AvatarProps) {
  return (
    <View
      accessible={false}
      style={[styles.circle, { width: size, height: size, borderRadius: RADIUS.full }]}
    >
      <Text style={[TYPE.captionXs, styles.text]}>{getInitials(name)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  text: {
    color: COLORS.ink,
  },
})

export default Avatar
