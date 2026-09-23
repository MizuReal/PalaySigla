// Full-viewport message shell — the web FullPageMessage ported to phones: a
// centered surface-soft panel (hairline or error border) with an optional
// glyph, a heading, body copy, and action children. Used by the not-found
// route and the root error boundary.
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Icon from './Icon'
import type { IconName } from './Icon'
import { COLORS, GUTTER, RADIUS, SPACING, TYPE } from '../theme/designTokens'

const PANEL_ICON_SIZE = 40

interface FullPageMessageProps {
  icon?: IconName | null
  title: string
  message: string
  tone?: 'neutral' | 'error'
  children?: ReactNode
}

function FullPageMessage({
  icon = null,
  title,
  message,
  tone = 'neutral',
  children = null,
}: FullPageMessageProps) {
  const isError = tone === 'error'
  return (
    <View style={styles.screen}>
      <View
        accessibilityRole={isError ? 'alert' : undefined}
        accessible={isError}
        style={[styles.panel, isError ? styles.panelError : styles.panelNeutral]}
      >
        {icon ? (
          <Icon
            name={icon}
            size={PANEL_ICON_SIZE}
            color={isError ? COLORS.error : COLORS.primary}
          />
        ) : null}
        <Text style={[TYPE.headingLg, styles.title]}>{title}</Text>
        <Text style={[TYPE.bodyMd, styles.message]}>{message}</Text>
        {children ? <View style={styles.actions}>{children}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.canvas,
    paddingHorizontal: GUTTER,
  },
  panel: {
    width: '100%',
    maxWidth: 448,
    borderWidth: 1,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.section,
    alignItems: 'center',
  },
  panelNeutral: {
    borderColor: COLORS.hairline,
  },
  panelError: {
    borderColor: COLORS.error,
  },
  title: {
    color: COLORS.ink,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  message: {
    color: COLORS.body,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  actions: {
    marginTop: SPACING.xxl,
    gap: SPACING.md,
    alignSelf: 'stretch',
  },
})

export default FullPageMessage
