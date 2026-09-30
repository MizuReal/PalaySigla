// Farmer verification status chip — mobile port of the web badge. The verified
// treatment is the wall's "Verified Rice Farmer" badge.
import { StyleSheet, Text, View } from 'react-native'
import Icon from '../Icon'
import {
  VERIFICATION_STATUSES,
  VERIFICATION_STATUS_LABELS,
} from '../../utils/verification'
import type { VerificationStatus } from '../../utils/verification'
import { COLORS, RADIUS, SPACING, TYPE } from '../../theme/designTokens'

const STATUS_COLORS: Record<VerificationStatus, { background: string; border: string; text: string }> =
  Object.freeze({
    [VERIFICATION_STATUSES.UNVERIFIED]: {
      background: COLORS.surfaceSoft,
      border: COLORS.hairline,
      text: COLORS.mute,
    },
    [VERIFICATION_STATUSES.PENDING]: {
      background: COLORS.accentYellowPale,
      border: COLORS.warningBright,
      text: COLORS.ink,
    },
    [VERIFICATION_STATUSES.VERIFIED]: {
      background: COLORS.accentLeafPale,
      border: COLORS.successDeep,
      text: COLORS.successDeep,
    },
  })

interface VerificationStatusBadgeProps {
  status: VerificationStatus
}

function VerificationStatusBadge({ status }: VerificationStatusBadgeProps) {
  const palette = STATUS_COLORS[status]
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.background, borderColor: palette.border },
      ]}
    >
      {status === VERIFICATION_STATUSES.VERIFIED ? (
        <Icon name="shield" size={14} color={palette.text} />
      ) : null}
      <Text style={[TYPE.captionSm, { color: palette.text }]}>
        {VERIFICATION_STATUS_LABELS[status]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: SPACING.xs,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
})

export default VerificationStatusBadge
