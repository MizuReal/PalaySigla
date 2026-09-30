// Farm information form — location, farm size, experience, and the varieties
// grown. Shown on the farmer's public profile wall.
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Button from '../Button'
import Icon from '../Icon'
import useFarmerDetails from '../../hooks/useFarmerDetails'
import { TOAST_VARIANTS, useToast } from '../../context/toastContext'
import { RICE_VARIETIES } from '../../utils/riceVarieties'
import { COLORS, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../../theme/designTokens'

function FarmerDetailsCard() {
  const { showToast } = useToast()
  const {
    isInitialLoading,
    loadError,
    retryLoad,
    barangay,
    municipality,
    province,
    farmSizeInput,
    yearsFarmingInput,
    selectedVarieties,
    customVarietyInput,
    errors,
    isDirty,
    canSave,
    isSaving,
    saveError,
    onLocationChange,
    onLocationBlur,
    onFarmSizeChange,
    onFarmSizeBlur,
    onYearsFarmingChange,
    onYearsFarmingBlur,
    onToggleVariety,
    onCustomVarietyChange,
    onAddCustomVariety,
    saveFarmerDetails,
  } = useFarmerDetails()

  if (isInitialLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    )
  }

  if (loadError) {
    return (
      <View style={styles.card}>
        <Text accessibilityRole="alert" style={[TYPE.bodySm, styles.title]}>
          {loadError}
        </Text>
        <View style={styles.retryWrap}>
          <Button label="Try again" onPress={retryLoad} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.card}>
      <Text style={[TYPE.headingSm, styles.title]}>Farm information</Text>
      <Text style={[TYPE.bodySm, styles.sub]}>
        Shown on your profile wall to help buyers and fellow farmers know your farm.
      </Text>

      <Text style={[TYPE.captionMd, styles.label]}>Barangay</Text>
      <TextInput
        style={[styles.input, errors.barangay ? styles.inputError : null]}
        value={barangay}
        onChangeText={(value) => onLocationChange('barangay', value)}
        onBlur={() => onLocationBlur('barangay')}
        placeholder="San Isidro"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Barangay"
        autoCorrect={false}
      />
      {errors.barangay ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.barangay}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Municipality</Text>
      <TextInput
        style={[styles.input, errors.municipality ? styles.inputError : null]}
        value={municipality}
        onChangeText={(value) => onLocationChange('municipality', value)}
        onBlur={() => onLocationBlur('municipality')}
        placeholder="Munoz"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Municipality"
        autoCorrect={false}
      />
      {errors.municipality ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.municipality}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Province</Text>
      <TextInput
        style={[styles.input, errors.province ? styles.inputError : null]}
        value={province}
        onChangeText={(value) => onLocationChange('province', value)}
        onBlur={() => onLocationBlur('province')}
        placeholder="Nueva Ecija"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Province"
        autoCorrect={false}
      />
      {errors.province ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.province}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Farm size (hectares)</Text>
      <TextInput
        style={[styles.input, errors.farmSize ? styles.inputError : null]}
        value={farmSizeInput}
        onChangeText={onFarmSizeChange}
        onBlur={onFarmSizeBlur}
        placeholder="1.5"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Farm size in hectares"
        keyboardType="decimal-pad"
      />
      {errors.farmSize ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.farmSize}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Years of farming experience</Text>
      <TextInput
        style={[styles.input, errors.yearsFarming ? styles.inputError : null]}
        value={yearsFarmingInput}
        onChangeText={onYearsFarmingChange}
        onBlur={onYearsFarmingBlur}
        placeholder="12"
        placeholderTextColor={COLORS.ash}
        accessibilityLabel="Years of farming experience"
        keyboardType="number-pad"
      />
      {errors.yearsFarming ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.yearsFarming}
        </Text>
      ) : null}

      <Text style={[TYPE.captionMd, styles.label]}>Rice varieties grown</Text>
      <View style={styles.varietyGrid}>
        {RICE_VARIETIES.map((variety) => {
          const selected = selectedVarieties.includes(variety)
          return (
            <Pressable
              key={variety}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled: isSaving }}
              disabled={isSaving}
              onPress={() => onToggleVariety(variety)}
              style={({ pressed }) => [
                styles.varietyChip,
                selected && styles.varietyChipSelected,
                pressed && !isSaving && styles.pressedDim,
              ]}
            >
              <Text
                style={[
                  TYPE.captionSm,
                  styles.varietyLabel,
                  selected && styles.varietyLabelSelected,
                ]}
              >
                {variety}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={styles.customRow}>
        <TextInput
          style={[styles.input, styles.customInput, errors.varieties ? styles.inputError : null]}
          value={customVarietyInput}
          onChangeText={onCustomVarietyChange}
          placeholder="Other variety (e.g. Dinorado)"
          placeholderTextColor={COLORS.ash}
          accessibilityLabel="Add another rice variety"
          autoCorrect={false}
          onSubmitEditing={onAddCustomVariety}
        />
        <Pressable
          accessibilityRole="button"
          disabled={isSaving || !customVarietyInput.trim()}
          onPress={onAddCustomVariety}
          style={({ pressed }) => [
            styles.addButton,
            (isSaving || !customVarietyInput.trim()) && styles.addButtonDisabled,
            pressed && styles.pressedDim,
          ]}
        >
          <Text style={[TYPE.buttonSm, styles.addButtonLabel]}>Add</Text>
        </Pressable>
      </View>
      {errors.varieties ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {errors.varieties}
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
          label={isSaving ? 'Saving…' : 'Save farm details'}
          onPress={() => {
            void saveFarmerDetails().then((saved) => {
              if (saved) {
                showToast('Farm details saved.', TOAST_VARIANTS.SUCCESS)
              }
            })
          }}
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
  sub: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
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
  varietyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  varietyChip: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
  },
  varietyChipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accentLeafPale,
  },
  varietyLabel: {
    color: COLORS.ink,
  },
  varietyLabelSelected: {
    color: COLORS.successDeep,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  customInput: {
    flex: 1,
    marginTop: 0,
  },
  addButton: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonLabel: {
    color: COLORS.ink,
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
  retryWrap: {
    marginTop: SPACING.lg,
    alignSelf: 'flex-start',
  },
  pressedDim: {
    opacity: 0.6,
  },
})

export default FarmerDetailsCard
