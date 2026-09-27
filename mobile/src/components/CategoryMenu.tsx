// Accessible category picker used by the marketplace and forum toolbars. The
// closed field shows the active option; tapping opens a bottom-sheet list of
// every option with its glyph, count, and a check on the selection. Replaces
// the older horizontally-scrolling chip rows.
import { useState } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Icon from './Icon'
import type { IconName } from './Icon'
import { COLORS, RADIUS, SPACING, TYPE } from '../theme/designTokens'

const FIELD_HEIGHT = 44
const OPTION_MIN_HEIGHT = 48
const SHEET_MAX_HEIGHT = 360
const CHEVRON_SIZE = 16
const OPTION_ICON_SIZE = 18
const CHECK_SIZE = 18

export interface CategoryMenuOption {
  id: string
  label: string
  icon?: IconName
  accent?: string
  count?: number
}

interface CategoryMenuProps {
  ariaLabel: string
  value: string
  options: CategoryMenuOption[]
  onChange: (id: string) => void
  style?: StyleProp<ViewStyle>
}

function CategoryMenu({
  ariaLabel,
  value,
  options,
  onChange,
  style = null,
}: CategoryMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selected = options.find((option) => option.id === value) ?? options[0]

  const close = () => setIsOpen(false)

  const handleSelect = (id: string) => {
    onChange(id)
    close()
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${ariaLabel}: ${selected.label}`}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen(true)}
        style={({ pressed }) => [styles.field, style, pressed && styles.fieldPressed]}
      >
        {selected.icon ? (
          <Icon
            name={selected.icon}
            size={CHEVRON_SIZE}
            color={selected.accent ?? COLORS.mute}
          />
        ) : null}
        <Text numberOfLines={1} style={[TYPE.bodyMd, styles.fieldLabel]}>
          {selected.label}
          {selected.count !== undefined ? ` · ${selected.count}` : ''}
        </Text>
        <Icon name="chevron-down" size={CHEVRON_SIZE} color={COLORS.ink} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={close}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            onPress={close}
            style={styles.backdrop}
          />
          <View style={styles.sheet}>
            <Text style={[TYPE.captionMd, styles.sheetTitle]}>{ariaLabel}</Text>
            <ScrollView style={styles.sheetList} contentContainerStyle={styles.sheetListContent}>
              {options.map((option) => {
                const isSelected = option.id === selected.id
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => handleSelect(option.id)}
                    style={({ pressed }) => [
                      styles.option,
                      pressed && styles.optionPressed,
                    ]}
                  >
                    {option.icon ? (
                      <Icon
                        name={option.icon}
                        size={OPTION_ICON_SIZE}
                        color={option.accent ?? COLORS.mute}
                      />
                    ) : null}
                    <Text style={[TYPE.bodyMd, styles.optionLabel]}>{option.label}</Text>
                    <View style={styles.optionTrailing}>
                      {option.count !== undefined ? (
                        <Text style={[TYPE.captionSm, styles.optionCount]}>
                          {option.count}
                        </Text>
                      ) : null}
                      {isSelected ? (
                        <Icon name="check" size={CHECK_SIZE} color={COLORS.primary} />
                      ) : null}
                    </View>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  field: {
    height: FIELD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  fieldPressed: {
    borderColor: COLORS.primary,
  },
  fieldLabel: {
    flex: 1,
    color: COLORS.ink,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surfaceElevated,
    opacity: 0.5,
  },
  sheet: {
    backgroundColor: COLORS.canvas,
    borderTopWidth: 1,
    borderColor: COLORS.hairline,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  sheetTitle: {
    color: COLORS.mute,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
  sheetList: {
    maxHeight: SHEET_MAX_HEIGHT,
  },
  sheetListContent: {
    paddingHorizontal: SPACING.md,
  },
  option: {
    minHeight: OPTION_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  optionPressed: {
    backgroundColor: COLORS.surfaceSoft,
  },
  optionLabel: {
    flex: 1,
    color: COLORS.ink,
  },
  optionTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  optionCount: {
    color: COLORS.mute,
  },
})

export default CategoryMenu
