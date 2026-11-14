import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AuthModal from '../AuthModal'

const mocks = vi.hoisted(() => ({
  closeAuthModal: vi.fn(),
  updatePassword: vi.fn(),
  showToast: vi.fn(),
}))

vi.mock('../../context/authContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    authModalMode: 'resetPassword',
    closeAuthModal: mocks.closeAuthModal,
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
  }),
}))

vi.mock('../../context/toastContext', () => ({
  TOAST_VARIANTS: {
    SUCCESS: 'success',
    INFO: 'info',
    ERROR: 'error',
  },
  useToast: () => ({ showToast: mocks.showToast }),
}))

vi.mock('../../services/auth', () => ({
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 72,
  resendConfirmationEmail: vi.fn(),
  sendPasswordReset: vi.fn(),
  updatePassword: mocks.updatePassword,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.updatePassword.mockResolvedValue(undefined)
})

describe('AuthModal reset password view', () => {
  it('requires matching passwords', () => {
    render(<AuthModal />)

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-secret-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'different-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(screen.getByText('Passwords do not match.').textContent).toBe(
      'Passwords do not match.'
    )
    expect(mocks.updatePassword).not.toHaveBeenCalled()
  })

  it('updates the password and shows the success state', async () => {
    render(<AuthModal />)

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-secret-123' },
    })
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'new-secret-123' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() =>
      expect(mocks.updatePassword).toHaveBeenCalledWith('new-secret-123')
    )
    await waitFor(() =>
      expect(screen.getByText('Password updated.').textContent).toBe(
        'Password updated.'
      )
    )
  })
})
