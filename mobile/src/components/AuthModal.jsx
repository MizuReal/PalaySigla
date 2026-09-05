// Auth dialog — the website's AuthModal treatment at phone scale, rebuilt
// from the same validation conventions: per-view forms (login / register /
// forgot password) plus the email-link return panels (verified, set-a-new-
// password). The `{component.modal-backdrop}` / `{component.modal-surface}`
// chrome is unchanged: full-screen dim (~70% surface-elevated), centered
// canvas panel, hairline border, 2px radius, no shadow.
//
// Validation mirrors website/src/components/AuthModal.jsx: blur errors only
// surface once a field has content, change clears the field error, and the
// submit pass validates everything and focuses the first invalid field.
// The parent remounts the dialog (keyed by the provider's authModalNonce) on
// every open and on mode changes, so forms always start fresh and the initial
// mode/error seeds are honored.
import { useRef, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../context/authContext.js'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  sendPasswordReset,
  updatePassword,
} from '../services/auth.js'
import { EMAIL_PATTERN, NAME_PATTERN } from '../utils/validation.js'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import { COLORS, RADIUS, SPACING, TYPE } from '../theme/designTokens.js'

const MODAL_MAX_WIDTH = 448
const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.'

const VIEWS = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
  RESET_PASSWORD: 'resetPassword',
  VERIFIED: 'verified',
})

const VIEWS_BY_MODE = Object.freeze({
  login: VIEWS.LOGIN,
  register: VIEWS.REGISTER,
  resetPassword: VIEWS.RESET_PASSWORD,
  verified: VIEWS.VERIFIED,
})

const VIEW_COPY = Object.freeze({
  [VIEWS.LOGIN]: {
    eyebrow: 'Sign in',
    title: 'Welcome back.',
    description: 'Sign in to your PalaySigla account.',
  },
  [VIEWS.REGISTER]: {
    eyebrow: 'Create an account',
    title: 'Join PalaySigla.',
    description: "Track your palay's quality from the first photo.",
  },
  [VIEWS.FORGOT]: {
    eyebrow: 'Password reset',
    title: 'Reset your password.',
    description: "We'll email you a link to set a new one.",
  },
  [VIEWS.RESET_PASSWORD]: {
    eyebrow: 'Password reset',
    title: 'Set a new password.',
    description: 'Pick something strong — between 8 and 72 characters.',
  },
  [VIEWS.VERIFIED]: {
    eyebrow: 'Sign up',
    title: 'Email verified.',
    description: '',
  },
})

const FIELD_ERRORS = Object.freeze({
  name: 'Please enter your name (2–60 characters, letters with spaces, hyphens, or apostrophes).',
  email: 'Please enter a valid email address.',
  loginPassword: 'Please enter your password.',
  registerPasswordShort: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  registerPasswordLong: `Your password must be at most ${PASSWORD_MAX_LENGTH} characters long.`,
})

const validateName = (value) => {
  if (!NAME_PATTERN.test(value.trim())) {
    return FIELD_ERRORS.name
  }
  return ''
}

const validateEmail = (value) => {
  if (!EMAIL_PATTERN.test(value.trim())) {
    return FIELD_ERRORS.email
  }
  return ''
}

const validateLoginPassword = (value) => {
  if (!value) {
    return FIELD_ERRORS.loginPassword
  }
  return ''
}

const validateRegisterPassword = (value) => {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return FIELD_ERRORS.registerPasswordShort
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return FIELD_ERRORS.registerPasswordLong
  }
  return ''
}

function AuthField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  inputRef,
  secureTextEntry = false,
  textContentType,
  autoComplete,
  keyboardType = 'default',
  maxLength,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
}) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <View style={styles.fieldGroup}>
      <Text style={[TYPE.captionMd, styles.label]}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          onBlur?.()
        }}
        placeholder={placeholder}
        placeholderTextColor={COLORS.ash}
        secureTextEntry={secureTextEntry}
        textContentType={textContentType}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        accessibilityLabel={label}
        style={[
          styles.input,
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

function FormBanner({ message }) {
  return (
    <View accessibilityRole="alert" style={styles.errorBanner}>
      <Icon name="info" size={20} color={COLORS.error} />
      <Text style={[TYPE.bodySm, styles.errorText]}>{message}</Text>
    </View>
  )
}

// success-state panel per the form-alert-success treatment (primary border
// on surface-soft), used by the sent / verified / reset-complete states
function SuccessCard({ title, message }) {
  return (
    <View style={styles.successCard}>
      <Icon name="check" size={20} color={COLORS.primary} />
      <View style={styles.successCardText}>
        <Text style={[TYPE.bodyStrong, styles.successTitle]}>{title}</Text>
        <Text style={[TYPE.bodySm, styles.successMessage]}>{message}</Text>
      </View>
    </View>
  )
}

function FormLink({ label, onPress, align = 'center' }) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [
        styles.linkTarget,
        align === 'right' ? styles.linkTargetRight : styles.linkTargetCenter,
        pressed && styles.pressedDim,
      ]}
    >
      <Text style={[TYPE.bodyStrong, styles.linkLabel]}>{label}</Text>
    </Pressable>
  )
}

function AuthDialog({ initialMode, initialError, onClose, onLogin, onRegister }) {
  const insets = useSafeAreaInsets()
  const [view, setView] = useState(() => VIEWS_BY_MODE[initialMode] ?? VIEWS.LOGIN)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState(initialError)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [forgotErrors, setForgotErrors] = useState({})
  const [resetErrors, setResetErrors] = useState({})
  const [isRegisterSent, setIsRegisterSent] = useState(false)
  const [isForgotSent, setIsForgotSent] = useState(false)
  const [isResetSent, setIsResetSent] = useState(false)

  const loginEmailRef = useRef(null)
  const loginPasswordRef = useRef(null)
  const registerNameRef = useRef(null)
  const registerEmailRef = useRef(null)
  const registerPasswordRef = useRef(null)
  const forgotEmailRef = useRef(null)
  const resetPasswordRef = useRef(null)

  const clearFieldError = (errorsSetter, field) => {
    errorsSetter((current) => {
      if (!(field in current)) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  // only surface blur errors once the field has content; empty fields are
  // caught by the submit-time pass instead
  const blurValidate = (errorsSetter, field, value, validator) => {
    if (!value) {
      return
    }
    const message = validator(value)
    errorsSetter((current) =>
      message ? { ...current, [field]: message } : current
    )
  }

  const switchView = (nextView) => {
    setFormError('')
    setView(nextView)
  }

  const handleLoginSubmit = async () => {
    const errors = {
      email: validateEmail(loginEmail),
      password: validateLoginPassword(loginPassword),
    }
    setLoginErrors(errors)
    if (errors.email || errors.password) {
      if (errors.email) {
        loginEmailRef.current?.focus()
      } else {
        loginPasswordRef.current?.focus()
      }
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      await onLogin(loginEmail.trim(), loginPassword)
    } catch (error) {
      setFormError(error?.message ?? GENERIC_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSubmit = async () => {
    const errors = {
      name: validateName(registerName),
      email: validateEmail(registerEmail),
      password: validateRegisterPassword(registerPassword),
    }
    setRegisterErrors(errors)
    if (errors.name || errors.email || errors.password) {
      const firstInvalidField = ['name', 'email', 'password'].find(
        (field) => errors[field]
      )
      const refs = {
        name: registerNameRef,
        email: registerEmailRef,
        password: registerPasswordRef,
      }
      refs[firstInvalidField].current?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      const result = await onRegister(
        registerName.trim(),
        registerEmail.trim(),
        registerPassword
      )
      if (result.requiresEmailConfirmation) {
        setIsRegisterSent(true)
      } else {
        onClose()
      }
    } catch (error) {
      setFormError(error?.message ?? GENERIC_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotSubmit = async () => {
    const emailError = validateEmail(forgotEmail)
    setForgotErrors(emailError ? { email: emailError } : {})
    if (emailError) {
      forgotEmailRef.current?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      await sendPasswordReset(forgotEmail.trim())
      setIsForgotSent(true)
    } catch (error) {
      setFormError(error?.message ?? GENERIC_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetSubmit = async () => {
    const errors = { password: validateRegisterPassword(resetPassword) }
    setResetErrors(errors)
    if (errors.password) {
      resetPasswordRef.current?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      await updatePassword(resetPassword)
      setIsResetSent(true)
    } catch (error) {
      setFormError(error?.message ?? GENERIC_ERROR_MESSAGE)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copy = VIEW_COPY[view]

  const renderBody = () => {
    if (view === VIEWS.LOGIN) {
      return (
        <View style={styles.form}>
          <AuthField
            label="Email"
            value={loginEmail}
            onChangeText={(value) => {
              setLoginEmail(value)
              clearFieldError(setLoginErrors, 'email')
            }}
            onBlur={() => blurValidate(setLoginErrors, 'email', loginEmail, validateEmail)}
            placeholder="you@sakahan.ph"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            error={loginErrors.email}
            inputRef={loginEmailRef}
            returnKeyType="next"
            onSubmitEditing={() => loginPasswordRef.current?.focus()}
          />
          <AuthField
            label="Password"
            value={loginPassword}
            onChangeText={(value) => {
              setLoginPassword(value)
              clearFieldError(setLoginErrors, 'password')
            }}
            onBlur={() =>
              blurValidate(
                setLoginErrors,
                'password',
                loginPassword,
                validateLoginPassword
              )
            }
            placeholder="Your password"
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            error={loginErrors.password}
            inputRef={loginPasswordRef}
            returnKeyType="done"
            onSubmitEditing={handleLoginSubmit}
          />
          <View style={styles.forgotRow}>
            <FormLink
              label="Forgot password?"
              align="right"
              onPress={() => switchView(VIEWS.FORGOT)}
            />
          </View>
          {formError ? <FormBanner message={formError} /> : null}
          <Button
            label={isSubmitting ? 'Signing in\u2026' : 'Sign in'}
            onPress={handleLoginSubmit}
            disabled={isSubmitting}
            fullWidth
          />
          <FormLink
            label="Don't have an account? Create one"
            onPress={() => switchView(VIEWS.REGISTER)}
          />
        </View>
      )
    }

    if (view === VIEWS.REGISTER) {
      if (isRegisterSent) {
        return (
          <View style={styles.form}>
            <SuccessCard
              title="Check your inbox."
              message={`We sent a confirmation link to ${registerEmail.trim()}. Tap it to activate your account.`}
            />
            <Button label="Done" onPress={onClose} fullWidth />
            <FormLink label="Back to sign in" onPress={() => switchView(VIEWS.LOGIN)} />
          </View>
        )
      }
      return (
        <View style={styles.form}>
          <AuthField
            label="Full name"
            value={registerName}
            onChangeText={(value) => {
              setRegisterName(value)
              clearFieldError(setRegisterErrors, 'name')
            }}
            onBlur={() => blurValidate(setRegisterErrors, 'name', registerName, validateName)}
            placeholder="Juan dela Cruz"
            textContentType="name"
            autoComplete="name"
            autoCapitalize="words"
            error={registerErrors.name}
            inputRef={registerNameRef}
            returnKeyType="next"
            onSubmitEditing={() => registerEmailRef.current?.focus()}
          />
          <AuthField
            label="Email"
            value={registerEmail}
            onChangeText={(value) => {
              setRegisterEmail(value)
              clearFieldError(setRegisterErrors, 'email')
            }}
            onBlur={() =>
              blurValidate(setRegisterErrors, 'email', registerEmail, validateEmail)
            }
            placeholder="you@sakahan.ph"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            error={registerErrors.email}
            inputRef={registerEmailRef}
            returnKeyType="next"
            onSubmitEditing={() => registerPasswordRef.current?.focus()}
          />
          <AuthField
            label="Password"
            value={registerPassword}
            onChangeText={(value) => {
              setRegisterPassword(value)
              clearFieldError(setRegisterErrors, 'password')
            }}
            onBlur={() =>
              blurValidate(
                setRegisterErrors,
                'password',
                registerPassword,
                validateRegisterPassword
              )
            }
            placeholder={`${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            error={registerErrors.password}
            inputRef={registerPasswordRef}
            returnKeyType="done"
            onSubmitEditing={handleRegisterSubmit}
          />
          {formError ? <FormBanner message={formError} /> : null}
          <Button
            label={isSubmitting ? 'Creating account\u2026' : 'Create account'}
            onPress={handleRegisterSubmit}
            disabled={isSubmitting}
            fullWidth
          />
          <FormLink label="Already have an account? Sign in" onPress={() => switchView(VIEWS.LOGIN)} />
        </View>
      )
    }

    if (view === VIEWS.FORGOT) {
      if (isForgotSent) {
        return (
          <View style={styles.form}>
            <SuccessCard
              title="Reset link sent."
              message={`If ${forgotEmail.trim()} belongs to an account, a password reset link is on its way.`}
            />
            <FormLink label="Back to sign in" onPress={() => switchView(VIEWS.LOGIN)} />
          </View>
        )
      }
      return (
        <View style={styles.form}>
          <AuthField
            label="Email"
            value={forgotEmail}
            onChangeText={(value) => {
              setForgotEmail(value)
              clearFieldError(setForgotErrors, 'email')
            }}
            onBlur={() => blurValidate(setForgotErrors, 'email', forgotEmail, validateEmail)}
            placeholder="you@sakahan.ph"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            error={forgotErrors.email}
            inputRef={forgotEmailRef}
            returnKeyType="done"
            onSubmitEditing={handleForgotSubmit}
          />
          {formError ? <FormBanner message={formError} /> : null}
          <Button
            label={isSubmitting ? 'Sending link\u2026' : 'Send reset link'}
            onPress={handleForgotSubmit}
            disabled={isSubmitting}
            fullWidth
          />
          <FormLink label="Back to sign in" onPress={() => switchView(VIEWS.LOGIN)} />
        </View>
      )
    }

    if (view === VIEWS.RESET_PASSWORD) {
      if (isResetSent) {
        return (
          <View style={styles.form}>
            <SuccessCard
              title="Password updated."
              message="Your new password is active and you are signed in on this device."
            />
            <Button label="Continue" onPress={onClose} fullWidth />
          </View>
        )
      }
      return (
        <View style={styles.form}>
          <AuthField
            label="New password"
            value={resetPassword}
            onChangeText={(value) => {
              setResetPassword(value)
              clearFieldError(setResetErrors, 'password')
            }}
            onBlur={() =>
              blurValidate(
                setResetErrors,
                'password',
                resetPassword,
                validateRegisterPassword
              )
            }
            placeholder={`${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`}
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX_LENGTH}
            error={resetErrors.password}
            inputRef={resetPasswordRef}
            returnKeyType="done"
            onSubmitEditing={handleResetSubmit}
          />
          {formError ? <FormBanner message={formError} /> : null}
          <Button
            label={isSubmitting ? 'Updating password\u2026' : 'Update password'}
            onPress={handleResetSubmit}
            disabled={isSubmitting}
            fullWidth
          />
        </View>
      )
    }

    // VIEWS.VERIFIED — reached by returning through a sign-up confirmation
    // link; the session hand-off already happened, this is the confirmation
    return (
      <View style={styles.form}>
        <SuccessCard
          title="Welcome to PalaySigla."
          message="Continue to explore the app with your new account."
        />
        <Button label="Continue" onPress={onClose} fullWidth />
      </View>
    )
  }

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close dialog"
          style={styles.backdrop}
        />
        <ScrollView
          style={styles.panelScroll}
          contentContainerStyle={styles.panelScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.panel}>
            <View style={styles.headerRow}>
              <View style={styles.headerText}>
                <Text style={[TYPE.captionMd, styles.eyebrow]}>{copy.eyebrow}</Text>
                <Text style={[TYPE.headingMd, styles.heading]}>{copy.title}</Text>
                {copy.description ? (
                  <Text style={[TYPE.bodySm, styles.lead]}>{copy.description}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressedDim]}
              >
                <Icon name="close" size={20} color={COLORS.mute} />
              </Pressable>
            </View>
            {renderBody()}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    authModalNonce,
    authModalError,
    closeAuthModal,
    signIn,
    signUp,
  } = useAuth()
  if (!isAuthModalOpen) {
    return null
  }
  return (
    <AuthDialog
      key={authModalNonce}
      initialMode={authModalMode}
      initialError={authModalError}
      onClose={closeAuthModal}
      onLogin={signIn}
      onRegister={signUp}
    />
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
  },
  panelScroll: {
    flexGrow: 0,
  },
  panelScrollContent: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    padding: SPACING.xl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.primary,
  },
  heading: {
    color: COLORS.ink,
    marginTop: SPACING.xs,
  },
  lead: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -SPACING.sm,
    marginRight: -SPACING.sm,
  },
  pressedDim: {
    opacity: 0.6,
  },
  form: {
    gap: SPACING.lg,
    marginTop: SPACING.lg,
  },
  fieldGroup: {
    gap: SPACING.sm,
  },
  label: {
    color: COLORS.ink,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.canvas,
    paddingHorizontal: SPACING.lg,
    color: COLORS.ink,
    ...TYPE.bodyMd,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  fieldError: {
    color: COLORS.error,
  },
  errorBanner: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  errorText: {
    flex: 1,
    color: COLORS.ink,
  },
  successCard: {
    flexDirection: 'row',
    gap: SPACING.lg,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surfaceSoft,
    padding: SPACING.lg,
  },
  successCardText: {
    flex: 1,
  },
  successTitle: {
    color: COLORS.ink,
  },
  successMessage: {
    color: COLORS.mute,
    marginTop: SPACING.xs,
  },
  forgotRow: {
    alignItems: 'flex-end',
  },
  linkTarget: {
    minHeight: 44,
    justifyContent: 'center',
  },
  linkTargetCenter: {
    alignItems: 'center',
  },
  linkTargetRight: {
    alignItems: 'flex-end',
  },
  linkLabel: {
    color: COLORS.linkBlue,
  },
})

export default AuthModal
