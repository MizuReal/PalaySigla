// Account details form — full name (required) and Philippine contact number
// (optional, stored E.164). Blur/submit validation, a dirty/disabled save, and
// an inline error banner on failure.
import { StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../Button'
import Icon from '../Icon'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'
import type { ProfileFieldErrors } from '../../utils/profileValidation'

interface ProfileDetailsFormProps {
  fullName: string
  phoneInput: string
  errors: ProfileFieldErrors
  isSaving: boolean
  canSave: boolean
  isDirty: boolean
  saveError: string
  onNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onNameBlur: () => void
  onPhoneBlur: () => void
  onSave: () => void
}

function ProfileDetailsForm({
  fullName,
  phoneInput,
  errors,
  isSaving,
  canSave,
  isDirty,
  saveError,
  onNameChange,
  onPhoneChange,
  onNameBlur,
  onPhoneBlur,
  onSave,
}: ProfileDetailsFormProps) {
  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>Account details</Text>

      <Text style={[TYPE.captionMd, styles.label]}>Full name</Text>
      <TextInput
        style={[styles.input, errors.fullName ? styles.inputError : null]}
        value={fullName}
        onChangeText={onNameChange}
        onBlur={onNameBlur}
        placeholder="Juan dela Cruz"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Full name"
        autoComplete="name"
        autoCorrect={false}
      />
      {errors.fullName ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.fullName}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>
        Contact number (Philippines)
      </Text>
      <TextInput
        style={[styles.input, errors.phone ? styles.inputError : null]}
        value={phoneInput}
        onChangeText={onPhoneChange}
        onBlur={onPhoneBlur}
        placeholder="0917 123 4567"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Contact number"
        keyboardType="phone-pad"
        autoComplete="tel-national"
        maxLength={20}
      />
      <Text style={[TYPE.captionSm, styles.hint]}>
        0917 123 4567 or +63 917 123 4567 — stored as +63
      </Text>
      {errors.phone ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.phone}
        </Text>
      ) : null}

      {saveError ? (
        <View accessibilityRole="alert" style={styles.saveError}>
          <Icon name="info" size={20} color={COLORS.error} />
          <Text style={[TYPE.bodySm, styles.saveErrorText]}>{saveError}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Button
          label={isSaving ? 'Saving…' : 'Save changes'}
          onPress={onSave}
          disabled={!canSave || isSaving}
        />
        <Text style={[TYPE.captionSm, styles.status]}>
          {isDirty ? 'You have unsaved changes' : 'No unsaved changes'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.ink,
  },
  label: {
    color: COLORS.ink,
    marginTop: SPACING.lg,
  },
  input: {
    minHeight: TOUCH_TARGET,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  hint: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  saveError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  saveErrorText: {
    flex: 1,
    color: COLORS.ink,
  },
  footer: {
    marginTop: SPACING.xl,
    gap: SPACING.sm,
  },
  status: {
    color: COLORS.mute,
  },
})

export default ProfileDetailsForm
