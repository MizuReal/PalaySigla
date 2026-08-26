import { useState } from 'react'
import Button from './Button.jsx'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'
import { useAuth } from '../context/authContext.js'
import { TOAST_VARIANTS, useToast } from '../context/toastContext.js'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  sendPasswordReset,
} from '../services/auth.js'
import { EMAIL_PATTERN, NAME_PATTERN } from '../utils/validation.js'

const MODAL_TITLE_ID = 'auth-modal-title'

const VIEWS = Object.freeze({
  LOGIN: 'login',
  REGISTER: 'register',
  FORGOT: 'forgot',
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
    description: 'Track your palay’s quality from the first photo.',
  },
  [VIEWS.FORGOT]: {
    eyebrow: 'Password reset',
    title: 'Reset your password.',
    description: 'We&rsquo;ll email you a link to set a new one.',
  },
})

const FIELD_ERRORS = Object.freeze({
  name: 'Please enter your name (2–60 characters, letters with spaces, hyphens, or apostrophes).',
  email: 'Please enter a valid email address.',
  loginPassword: 'Please enter your password.',
  registerPasswordShort: `Your password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  registerPasswordLong: `Your password must be at most ${PASSWORD_MAX_LENGTH} characters long.`,
})

const INPUT_CLASSES =
  'h-11 w-full border border-hairline bg-canvas px-4 body-md text-ink placeholder:text-stone focus:border-2 focus:border-primary focus:px-[15px]'

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

function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  error,
}) {
  return (
    <div>
      <label htmlFor={id} className="caption-md text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        className={`mt-2 ${INPUT_CLASSES} ${error ? 'border-error' : ''}`}
      />
      {error && (
        <p className="caption-sm mt-2 text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function FormError({ message }) {
  return (
    <div
      className="flex items-start gap-3 border border-error bg-surface-soft p-4"
      role="alert"
    >
      <Icon name="close" className="mt-0.5 h-4 w-4 shrink-0 text-error" />
      <p className="body-sm text-ink">{message}</p>
    </div>
  )
}

function SentConfirmation({ icon, title, message }) {
  return (
    <div className="flex items-start gap-3 border border-primary bg-surface-soft p-6">
      <Icon name={icon} className="mt-1 h-5 w-5 shrink-0 text-primary" />
      <div>
        <p className="body-strong text-ink">{title}</p>
        <p className="body-sm mt-1 text-mute">{message}</p>
      </div>
    </div>
  )
}

function AuthModal() {
  const { authModalMode, closeAuthModal, signIn, signUp } = useAuth()
  const { showToast } = useToast()

  // mounted only while the modal is open, so initial state is always fresh
  const [view, setView] = useState(authModalMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [loginErrors, setLoginErrors] = useState({})
  const [registerErrors, setRegisterErrors] = useState({})
  const [forgotErrors, setForgotErrors] = useState({})
  const [isRegisterSent, setIsRegisterSent] = useState(false)
  const [isForgotSent, setIsForgotSent] = useState(false)

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

  const handleLoginSubmit = async (event) => {
    event.preventDefault()
    const errors = {
      email: validateEmail(loginEmail),
      password: validateLoginPassword(loginPassword),
    }
    setLoginErrors(errors)
    if (errors.email || errors.password) {
      document.getElementById(errors.email ? 'login-email' : 'login-password')?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      await signIn(loginEmail.trim(), loginPassword)
      closeAuthModal()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRegisterSubmit = async (event) => {
    event.preventDefault()
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
      document.getElementById(`register-${firstInvalidField}`)?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      const result = await signUp(
        registerName.trim(),
        registerEmail.trim(),
        registerPassword
      )
      if (result.requiresEmailConfirmation) {
        showToast(
          'Verification email sent — check your inbox.',
          TOAST_VARIANTS.INFO
        )
        setIsRegisterSent(true)
      } else {
        closeAuthModal()
      }
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotSubmit = async (event) => {
    event.preventDefault()
    const emailError = validateEmail(forgotEmail)
    setForgotErrors(emailError ? { email: emailError } : {})
    if (emailError) {
      document.getElementById('forgot-email')?.focus()
      return
    }
    setFormError('')
    setIsSubmitting(true)
    try {
      await sendPasswordReset(forgotEmail.trim())
      setIsForgotSent(true)
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copy = VIEW_COPY[view]

  const renderForm = () => {
    if (view === VIEWS.LOGIN) {
      return (
        <form onSubmit={handleLoginSubmit} noValidate className="mt-6 space-y-4">
          <TextField
            id="login-email"
            label="Email"
            type="email"
            value={loginEmail}
            onChange={(event) => {
              setLoginEmail(event.target.value)
              clearFieldError(setLoginErrors, 'email')
            }}
            onBlur={() =>
              blurValidate(setLoginErrors, 'email', loginEmail, validateEmail)
            }
            placeholder="you@sakahan.ph"
            autoComplete="email"
            error={loginErrors.email}
          />
          <TextField
            id="login-password"
            label="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => {
              setLoginPassword(event.target.value)
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
            autoComplete="current-password"
            error={loginErrors.password}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchView(VIEWS.FORGOT)}
              className="body-sm text-link-blue transition-colors hover:text-primary"
            >
              Forgot password?
            </button>
          </div>
          {formError && <FormError message={formError} />}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full justify-center"
          >
            {isSubmitting ? 'Signing in\u2026' : 'Sign in'}
          </Button>
          <p className="body-sm text-center text-mute">
            Don&rsquo;t have an account?{' '}
            <button
              type="button"
              onClick={() => switchView(VIEWS.REGISTER)}
              className="body-strong text-link-blue transition-colors hover:text-primary"
            >
              Create one
            </button>
          </p>
        </form>
      )
    }

    if (view === VIEWS.REGISTER) {
      if (isRegisterSent) {
        return (
          <div className="mt-6">
            <SentConfirmation
              icon="check"
              title="Check your inbox."
              message={`We sent a confirmation link to ${registerEmail.trim()}. Click it to activate your account.`}
            />
          </div>
        )
      }
      return (
        <form onSubmit={handleRegisterSubmit} noValidate className="mt-6 space-y-4">
          <TextField
            id="register-name"
            label="Full name"
            type="text"
            value={registerName}
            onChange={(event) => {
              setRegisterName(event.target.value)
              clearFieldError(setRegisterErrors, 'name')
            }}
            onBlur={() =>
              blurValidate(setRegisterErrors, 'name', registerName, validateName)
            }
            placeholder="Juan dela Cruz"
            autoComplete="name"
            error={registerErrors.name}
          />
          <TextField
            id="register-email"
            label="Email"
            type="email"
            value={registerEmail}
            onChange={(event) => {
              setRegisterEmail(event.target.value)
              clearFieldError(setRegisterErrors, 'email')
            }}
            onBlur={() =>
              blurValidate(setRegisterErrors, 'email', registerEmail, validateEmail)
            }
            placeholder="you@sakahan.ph"
            autoComplete="email"
            error={registerErrors.email}
          />
          <TextField
            id="register-password"
            label="Password"
            type="password"
            value={registerPassword}
            onChange={(event) => {
              setRegisterPassword(event.target.value)
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
            placeholder={`${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters`}
            autoComplete="new-password"
            error={registerErrors.password}
          />
          {formError && <FormError message={formError} />}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full justify-center"
          >
            {isSubmitting ? 'Creating account\u2026' : 'Create account'}
          </Button>
          <p className="body-sm text-center text-mute">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => switchView(VIEWS.LOGIN)}
              className="body-strong text-link-blue transition-colors hover:text-primary"
            >
              Sign in
            </button>
          </p>
        </form>
      )
    }

    if (isForgotSent) {
      return (
        <div className="mt-6">
          <SentConfirmation
            icon="check"
            title="Reset link sent."
            message={`If ${forgotEmail.trim()} belongs to an account, a password reset link is on its way.`}
          />
        </div>
      )
    }
    return (
      <form onSubmit={handleForgotSubmit} noValidate className="mt-6 space-y-4">
        <TextField
          id="forgot-email"
          label="Email"
          type="email"
          value={forgotEmail}
          onChange={(event) => {
            setForgotEmail(event.target.value)
            clearFieldError(setForgotErrors, 'email')
          }}
          onBlur={() =>
            blurValidate(setForgotErrors, 'email', forgotEmail, validateEmail)
          }
          placeholder="you@sakahan.ph"
          autoComplete="email"
          error={forgotErrors.email}
        />
        {formError && <FormError message={formError} />}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full justify-center"
        >
          {isSubmitting ? 'Sending link\u2026' : 'Send reset link'}
        </Button>
        <p className="body-sm text-center text-mute">
          <button
            type="button"
            onClick={() => switchView(VIEWS.LOGIN)}
            className="body-strong text-link-blue transition-colors hover:text-primary"
          >
            Back to sign in
          </button>
        </p>
      </form>
    )
  }

  return (
    <Modal onClose={closeAuthModal} labelledBy={MODAL_TITLE_ID}>
      <p className="caption-md text-primary">{copy.eyebrow}</p>
      <h2 id={MODAL_TITLE_ID} className="heading-md mt-2 text-ink">
        {copy.title}
      </h2>
      <p className="body-sm mt-1 text-mute">{copy.description}</p>
      {renderForm()}
    </Modal>
  )
}

export default AuthModal
