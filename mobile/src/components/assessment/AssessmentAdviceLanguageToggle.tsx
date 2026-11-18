// Two-state language control for the opening analysis. It disappears once the
// farmer sends a follow-up, because replies mirror the user's own language.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AssessmentAdviceLanguage } from '../../types/api'
import {
  BORDER_WIDTH,
  COLORS,
  SPACING,
  TOUCH_TARGET,
  TYPE,
} from '../../theme/designTokens'

const LANGUAGE_LABELS: Record<AssessmentAdviceLanguage, string> = {
  english: 'English',
  tagalog: 'Tagalog',
}

const LANGUAGE_ORDER: readonly AssessmentAdviceLanguage[] = ['english', 'tagalog']

interface AssessmentAdviceLanguageToggleProps {
  value: AssessmentAdviceLanguage
  onChange: (language: AssessmentAdviceLanguage) => void
  disabled?: boolean
}

function AssessmentAdviceLanguageToggle({
  value,
  onChange,
  disabled = false,
}: AssessmentAdviceLanguageToggleProps) {
  return (
    <View style={styles.row}>
      {LANGUAGE_ORDER.map((language) => {
        const isActive = language === value
        return (
          <Pressable
            key={language}
            accessibilityRole="button"
            accessibilityLabel={`Show the analysis in ${LANGUAGE_LABELS[language]}`}
            accessibilityState={{ selected: isActive, disabled }}
            disabled={disabled}
            onPress={() => onChange(language)}
            style={({ pressed }) => [
              styles.option,
              isActive && styles.optionActive,
              pressed && !disabled && styles.optionPressed,
            ]}
          >
            <Text
              style={[
                TYPE.bodyStrong,
                styles.label,
                isActive && styles.labelActive,
                disabled && styles.labelDisabled,
              ]}
            >
              {LANGUAGE_LABELS[language]}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  option: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: BORDER_WIDTH.focus,
    borderBottomColor: 'transparent',
  },
  optionActive: {
    borderBottomColor: COLORS.primary,
  },
  optionPressed: {
    opacity: 0.6,
  },
  label: {
    color: COLORS.mute,
  },
  labelActive: {
    color: COLORS.primary,
  },
  labelDisabled: {
    color: COLORS.ash,
  },
})

export default AssessmentAdviceLanguageToggle
