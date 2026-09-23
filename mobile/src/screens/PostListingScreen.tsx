// Post-listing wizard — a full-screen root-stack push, the mobile equivalent of
// the web's PostListingModal. Three steps (details → photo → location) gated by
// the shared per-step validation, create-then-upload with rollback on failure,
// then a success panel that returns to the refreshed marketplace feed. Photo
// handling lives in useImagePicker; the location step reuses the shared
// MapPicker (WebView Leaflet + backend geocoding).
import { useEffect, useRef, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { RefObject } from 'react'
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import Button from '../components/Button'
import Icon from '../components/Icon'
import MapPicker from '../components/marketplace/MapPicker'
import PostListingImageUploader from '../components/marketplace/PostListingImageUploader'
import { TOAST_VARIANTS, useToast } from '../context/toastContext'
import useImagePicker from '../hooks/useImagePicker'
import usePostListing from '../hooks/usePostListing'
import {
  isListingCategory,
  isListingUnit,
  LISTING_CATEGORIES,
  LISTING_UNITS,
} from '../services/listings'
import { CATEGORY_LABELS, UNIT_LABELS } from '../utils/format'
import { validateListingStep } from '../utils/listingValidation'
import type { ListingStepErrors } from '../utils/listingValidation'
import { COLORS, GUTTER, RADIUS, SPACING, TOUCH_TARGET, TYPE } from '../theme/designTokens'
import type { MapPosition } from '../components/marketplace/mapConfig'
import type { RootStackParamList } from '../types/navigation'

const TOTAL_STEPS = 3
const DESCRIPTION_INPUT_HEIGHT = 96
const PROGRESS_TRACK_HEIGHT = 4

const STEP_TITLES: Record<number, string> = Object.freeze({
  1: 'Tell us about it',
  2: 'Add a photo',
  3: 'Pin the location',
})

const STEP_DESCRIPTIONS: Record<number, string> = Object.freeze({
  1: 'What are you selling, and for how much?',
  2: 'A clear close-up helps buyers trust the listing.',
  3: 'Drag the map and drop the pin where it is.',
})

const UNIT_OPTIONS = LISTING_UNITS.map((unit) => ({
  value: unit,
  label: UNIT_LABELS[unit],
}))

const CATEGORY_OPTIONS = LISTING_CATEGORIES.map((category) => ({
  value: category,
  label: CATEGORY_LABELS[category],
}))

interface ChoiceOption {
  value: string
  label: string
}

interface WizardFieldProps {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  error?: string
  optional?: boolean
  multiline?: boolean
  keyboardType?: TextInputProps['keyboardType']
  inputRef?: RefObject<TextInput | null>
}

function WizardField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  optional = false,
  multiline = false,
  keyboardType = 'default',
  inputRef,
}: WizardFieldProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View>
      <Text style={[TYPE.captionMd, styles.fieldLabel]}>
        {label}
        {optional ? (
          <Text style={[TYPE.captionSm, styles.optionalLabel]}> (optional)</Text>
        ) : null}
      </Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.stone}
        keyboardType={keyboardType}
        multiline={multiline}
        accessibilityLabel={label}
        autoCorrect={false}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

interface ChoicePillsProps {
  label: string
  options: readonly ChoiceOption[]
  selected: string
  onSelect: (value: string) => void
  error?: string
}

function ChoicePills({ label, options, selected, onSelect, error }: ChoicePillsProps) {
  return (
    <View>
      <Text style={[TYPE.captionMd, styles.fieldLabel]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.pillScroller}
        contentContainerStyle={styles.pillRow}
      >
        {options.map((option) => {
          const isActive = selected === option.value
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={option.label}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.pill,
                isActive ? styles.pillActive : styles.pillInactive,
                pressed && !isActive && styles.pillPressed,
              ]}
            >
              <Text
                style={[
                  TYPE.buttonSm,
                  isActive ? styles.pillTextActive : styles.pillText,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {error ? (
        <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

function StepProgress({ step }: { step: number }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]}
      />
    </View>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <Icon name="info" size={20} color={COLORS.error} />
      <Text style={[TYPE.bodySm, styles.errorBannerText]}>{message}</Text>
    </View>
  )
}

interface OutlineButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

function OutlineButton({ label, onPress, disabled = false, style }: OutlineButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.outlineButton,
        style,
        disabled && styles.outlineDisabled,
        pressed && !disabled && styles.outlinePressed,
      ]}
    >
      <Text
        style={[
          TYPE.buttonMd,
          disabled ? styles.outlineLabelDisabled : styles.outlineLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

interface WizardTopBarProps {
  topInset: number
  onBack: () => void
  backDisabled?: boolean
}

function WizardTopBar({ topInset, onBack, backDisabled = false }: WizardTopBarProps) {
  return (
    <View style={[styles.topBar, { paddingTop: topInset + SPACING.sm }]}>
      <View style={styles.topBarRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          accessibilityState={{ disabled: backDisabled }}
          disabled={backDisabled}
          onPress={onBack}
          hitSlop={SPACING.sm}
          style={({ pressed }) => [
            styles.backButton,
            pressed && !backDisabled && styles.pressedDim,
          ]}
        >
          <Icon name="chevron-left" size={24} color={COLORS.ink} />
        </Pressable>
        <Text style={[TYPE.captionMd, styles.topBarLabel]}>Marketplace</Text>
      </View>
    </View>
  )
}

type PostListingScreenProps = NativeStackScreenProps<RootStackParamList, 'PostListing'>

function PostListingScreen({ navigation }: PostListingScreenProps) {
  const insets = useSafeAreaInsets()
  const { showToast } = useToast()
  const { postListing, isSubmitting } = usePostListing()
  const {
    image,
    isProcessing,
    error: imageError,
    canOpenSettings,
    takePhoto,
    pickFromLibrary,
    removeImage,
    openSettings,
  } = useImagePicker()

  const [step, setStep] = useState(1)
  const [isPosted, setIsPosted] = useState(false)
  const [errors, setErrors] = useState<ListingStepErrors>({})
  const [serverError, setServerError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState('')
  const [quantity, setQuantity] = useState('')
  const [position, setPosition] = useState<MapPosition | null>(null)
  const [locationLabel, setLocationLabel] = useState('')

  const titleRef = useRef<TextInput>(null)
  const descriptionRef = useRef<TextInput>(null)
  const priceRef = useRef<TextInput>(null)
  const quantityRef = useRef<TextInput>(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!isSubmitting) {
        return
      }
      // an upload in flight must not be abandoned mid-submit
      event.preventDefault()
    })
    return unsubscribe
  }, [navigation, isSubmitting])

  const clearFieldError = (field: keyof ListingStepErrors) => {
    setErrors((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validateCurrentStep = (stepToValidate: number): ListingStepErrors =>
    validateListingStep(stepToValidate, {
      title,
      description,
      price,
      unit,
      category,
      quantity,
      image,
      lat: position ? position[0] : null,
      lng: position ? position[1] : null,
      locationLabel,
    })

  const focusFirstError = (stepErrors: ListingStepErrors) => {
    const firstField = Object.keys(stepErrors)[0]
    const fieldRefs: Record<string, RefObject<TextInput | null> | undefined> = {
      title: titleRef,
      description: descriptionRef,
      price: priceRef,
      quantity: quantityRef,
    }
    fieldRefs[firstField]?.current?.focus()
  }

  const handleContinue = () => {
    const stepErrors = validateCurrentStep(step)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(stepErrors)
      return
    }
    setServerError('')
    setStep((current) => Math.min(current + 1, TOTAL_STEPS))
  }

  const handleBack = () => {
    if (isSubmitting) {
      return
    }
    if (step === 1) {
      navigation.goBack()
      return
    }
    setErrors({})
    setServerError('')
    setStep((current) => current - 1)
  }

  const handleSubmit = async () => {
    const stepErrors = validateCurrentStep(TOTAL_STEPS)
    setErrors(stepErrors)
    if (Object.keys(stepErrors).length > 0) {
      focusFirstError(stepErrors)
      return
    }
    // validation above guarantees these; narrowed here for the typed input
    if (!image || !position || !isListingUnit(unit) || !isListingCategory(category)) {
      return
    }
    setServerError('')
    try {
      await postListing({
        title,
        description: description.trim(),
        price: Number(price),
        unit,
        category,
        quantity: quantity === '' ? null : Number(quantity),
        lat: position[0],
        lng: position[1],
        locationLabel,
        image,
      })
      setIsPosted(true)
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : 'Could not post the listing. Please try again.'
      )
    }
  }

  const handleTakePhoto = () => {
    clearFieldError('photo')
    takePhoto()
  }

  const handlePickFromLibrary = () => {
    clearFieldError('photo')
    pickFromLibrary()
  }

  const handleRemoveImage = () => {
    clearFieldError('photo')
    removeImage()
  }

  const handlePositionChange = (nextPosition: MapPosition) => {
    setPosition(nextPosition)
    clearFieldError('location')
  }

  const handleDone = () => {
    showToast('Listing posted! Buyers can now find it.', TOAST_VARIANTS.SUCCESS)
    navigation.navigate('Main', { screen: 'Marketplace' })
  }

  if (isPosted) {
    return (
      <View style={styles.screen}>
        <WizardTopBar topInset={insets.top} onBack={handleDone} />
        <View style={[styles.successWrap, { paddingBottom: insets.bottom + SPACING.xxl }]}>
          <View style={styles.successCard}>
            <Icon name="check" size={20} color={COLORS.primary} />
            <View style={styles.successText}>
              <Text style={[TYPE.bodyStrong, styles.successTitle]}>
                Listing posted!
              </Text>
              <Text style={[TYPE.bodySm, styles.successMessage]}>
                Buyers can now find it in the marketplace.
              </Text>
            </View>
          </View>
          <Button label="Back to marketplace" onPress={handleDone} fullWidth />
        </View>
      </View>
    )
  }

  const renderStepBody = () => {
    if (step === 1) {
      return (
        <View style={styles.fieldStack}>
          <WizardField
            label="Title"
            value={title}
            onChangeText={(value) => {
              setTitle(value)
              clearFieldError('title')
            }}
            placeholder="Freshly harvested palay, dry and clean"
            error={errors.title}
            inputRef={titleRef}
          />
          <WizardField
            label="Description"
            optional
            multiline
            value={description}
            onChangeText={(value) => {
              setDescription(value)
              clearFieldError('description')
            }}
            placeholder="Variety, moisture, harvest date — anything a buyer should know."
            error={errors.description}
            inputRef={descriptionRef}
          />
          <WizardField
            label="Price (₱)"
            value={price}
            onChangeText={(value) => {
              setPrice(value)
              clearFieldError('price')
            }}
            placeholder="1200"
            keyboardType="decimal-pad"
            error={errors.price}
            inputRef={priceRef}
          />
          <ChoicePills
            label="Unit"
            options={UNIT_OPTIONS}
            selected={unit}
            onSelect={(value) => {
              setUnit(value)
              clearFieldError('unit')
            }}
            error={errors.unit}
          />
          <ChoicePills
            label="Category"
            options={CATEGORY_OPTIONS}
            selected={category}
            onSelect={(value) => {
              setCategory(value)
              clearFieldError('category')
            }}
            error={errors.category}
          />
          <WizardField
            label="Quantity"
            optional
            value={quantity}
            onChangeText={(value) => {
              setQuantity(value)
              clearFieldError('quantity')
            }}
            placeholder="50"
            keyboardType="decimal-pad"
            error={errors.quantity}
            inputRef={quantityRef}
          />
        </View>
      )
    }

    if (step === 2) {
      return (
        <PostListingImageUploader
          image={image}
          isProcessing={isProcessing}
          error={imageError || errors.photo || ''}
          canOpenSettings={canOpenSettings}
          onTakePhoto={handleTakePhoto}
          onPickFromLibrary={handlePickFromLibrary}
          onRemove={handleRemoveImage}
          onOpenSettings={openSettings}
        />
      )
    }

    return (
      <View>
        <MapPicker
          position={position}
          onPositionChange={handlePositionChange}
          onLocationLabel={setLocationLabel}
        />
        {errors.location ? (
          <Text accessibilityRole="alert" style={[TYPE.captionSm, styles.fieldError]}>
            {errors.location}
          </Text>
        ) : null}
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <WizardTopBar
        topInset={insets.top}
        onBack={handleBack}
        backDisabled={isSubmitting}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={[TYPE.captionMd, styles.eyebrow]}>
          Post a listing — step {step} of {TOTAL_STEPS}
        </Text>
        <Text style={[TYPE.headingMd, styles.stepTitle]}>{STEP_TITLES[step]}</Text>
        <Text style={[TYPE.bodySm, styles.stepDescription]}>
          {STEP_DESCRIPTIONS[step]}
        </Text>
        <StepProgress step={step} />

        <View style={styles.stepBody}>{renderStepBody()}</View>

        {serverError ? <ErrorBanner message={serverError} /> : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.lg }]}>
        {step > 1 ? (
          <View style={styles.footerSlot}>
            <OutlineButton
              label="Back"
              onPress={handleBack}
              disabled={isSubmitting}
              style={styles.footerButton}
            />
          </View>
        ) : null}
        <View style={styles.footerSlot}>
          {step < TOTAL_STEPS ? (
            <Button label="Continue" onPress={handleContinue} fullWidth />
          ) : (
            <Button
              label={isSubmitting ? 'Posting…' : 'Post listing'}
              onPress={handleSubmit}
              disabled={isSubmitting}
              fullWidth
            />
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  topBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
    paddingBottom: SPACING.sm,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    gap: SPACING.sm,
  },
  backButton: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedDim: {
    opacity: 0.6,
  },
  topBarLabel: {
    color: COLORS.mute,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  stepTitle: {
    color: COLORS.ink,
    marginTop: SPACING.sm,
  },
  stepDescription: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  progressTrack: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: COLORS.surfaceSoft,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  progressFill: {
    height: PROGRESS_TRACK_HEIGHT,
    backgroundColor: COLORS.primary,
  },
  stepBody: {
    marginBottom: SPACING.lg,
  },
  fieldStack: {
    gap: SPACING.lg,
  },
  fieldLabel: {
    color: COLORS.ink,
  },
  optionalLabel: {
    color: COLORS.mute,
    textTransform: 'none',
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
  inputMultiline: {
    minHeight: DESCRIPTION_INPUT_HEIGHT,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
    marginTop: SPACING.sm,
  },
  pillScroller: {
    marginTop: SPACING.sm,
    flexGrow: 0,
  },
  pillRow: {
    gap: SPACING.sm,
  },
  pill: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
  },
  pillInactive: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
  },
  pillActive: {
    borderColor: COLORS.ink,
    backgroundColor: COLORS.ink,
  },
  pillPressed: {
    borderColor: COLORS.primary,
  },
  pillText: {
    color: COLORS.ink,
  },
  pillTextActive: {
    color: COLORS.onDark,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  errorBannerText: {
    flex: 1,
    color: COLORS.ink,
  },
  footer: {
    flexDirection: 'row',
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.lg,
  },
  footerSlot: {
    flex: 1,
  },
  footerButton: {
    minHeight: TOUCH_TARGET,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
  },
  outlinePressed: {
    borderColor: COLORS.primaryDark,
  },
  outlineDisabled: {
    borderColor: COLORS.hairline,
    backgroundColor: COLORS.surfaceSoft,
  },
  outlineLabel: {
    color: COLORS.ink,
  },
  outlineLabelDisabled: {
    color: COLORS.ash,
  },
  successWrap: {
    flex: 1,
    paddingHorizontal: GUTTER,
    paddingTop: SPACING.xxl,
    gap: SPACING.xl,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceSoft,
    borderRadius: RADIUS.sm,
    padding: SPACING.xl,
  },
  successText: {
    flex: 1,
  },
  successTitle: {
    color: COLORS.ink,
  },
  successMessage: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
})

export default PostListingScreen
