/// <reference types="jest" />
import { render } from '@testing-library/react-native'

const mockShowToast = jest.fn()

jest.mock('../../context/authContext', () => ({ useAuth: jest.fn() }))
jest.mock('../../context/toastContext', () => ({
  TOAST_VARIANTS: { SUCCESS: 'success', INFO: 'info', ERROR: 'error' },
  useToast: () => ({ showToast: mockShowToast }),
}))

import { useAuth } from '../../context/authContext'
import AuthToasts from '../AuthToasts'

const mockedUseAuth = jest.mocked(useAuth)

function mockAuth(user: unknown, isInitializing = false) {
  mockedUseAuth.mockReturnValue({
    user,
    isInitializing,
  } as ReturnType<typeof useAuth>)
}

const SESSION_USER = { id: 'u1', user_metadata: { full_name: 'Juan Cruz' } }

beforeEach(() => {
  jest.resetAllMocks()
})

describe('AuthToasts', () => {
  it('never toasts the cold-start restored session', async () => {
    mockAuth(SESSION_USER)
    await render(<AuthToasts />)

    expect(mockShowToast).not.toHaveBeenCalled()
  })

  it('announces a login after the first observed state', async () => {
    mockAuth(null)
    const screen = await render(<AuthToasts />)

    mockAuth(SESSION_USER)
    await screen.rerender(<AuthToasts />)

    expect(mockShowToast).toHaveBeenCalledWith(
      'Logged in. Welcome back, Juan Cruz!',
      'success'
    )
  })

  it('announces a sign-out', async () => {
    mockAuth(SESSION_USER)
    const screen = await render(<AuthToasts />)

    mockAuth(null)
    await screen.rerender(<AuthToasts />)

    expect(mockShowToast).toHaveBeenCalledWith("You're signed out.", 'info')
  })
})
