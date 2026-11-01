// Two-cell switch above the Scan tab: sheet OCR versus grain assessment. The
// active cell uses the documented treatment — primary label plus a 2px primary
// underline — so both flows stay inside the existing five-cell tab chrome.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { COLORS, GUTTER, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

export type ScanMode = 'sheet' | 'grain'

const MODES: { key: ScanMode; label: string }[] = [
  { key: 'sheet', label: 'Sheet scan' },
  { key: 'grain', label: 'Grain photo' },
]

interface ScanModeTabsProps {
  mode: ScanMode
  onChange: (mode: ScanMode) => void
}

function ScanModeTabs({ mode, onChange }: ScanModeTabsProps) {
  return (
    <View style={styles.bar}>
      {MODES.map((item) => {
        const active = item.key === mode
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.key)}
            style={[styles.cell, active && styles.cellActive]}
          >
            <Text style={[TYPE.buttonMd, styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingHorizontal: GUTTER,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  cell: {
    flex: 1,
    minHeight: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.canvas,
  },
  cellActive: {
    borderBottomColor: COLORS.primary,
  },
  label: {
    color: COLORS.mute,
  },
  labelActive: {
    color: COLORS.primary,
  },
})

export default ScanModeTabs
