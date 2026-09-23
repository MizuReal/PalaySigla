/// <reference types="jest" />
import { fireEvent, render, waitFor } from '@testing-library/react-native'

jest.mock('../../../context/authContext', () => ({ useAuth: jest.fn() }))
jest.mock('../../../services/forum', () => ({
  setForumPostHeart: jest.fn(),
  setForumCommentHeart: jest.fn(),
}))

import { useAuth } from '../../../context/authContext'
import { setForumPostHeart } from '../../../services/forum'
import HeartButton from '../HeartButton'

const mockedUseAuth = jest.mocked(useAuth)
const mockedSetForumPostHeart = jest.mocked(setForumPostHeart)

beforeEach(() => {
  jest.resetAllMocks()
  mockedUseAuth.mockReturnValue({
    user: { id: 'u1' },
  } as ReturnType<typeof useAuth>)
  mockedSetForumPostHeart.mockResolvedValue(undefined)
})

describe('HeartButton', () => {
  it('optimistically hearts and notifies on success', async () => {
    const onChanged = jest.fn()
    const screen = await render(
      <HeartButton
        postId="P1"
        hearted={false}
        count={2}
        onRequireSignIn={jest.fn()}
        onChanged={onChanged}
        onError={jest.fn()}
      />
    )

    await fireEvent.press(screen.getByRole('button', { name: 'Heart this' }))

    await waitFor(() =>
      expect(mockedSetForumPostHeart).toHaveBeenCalledWith('P1', 'u1', true)
    )
    expect(screen.getByText('3')).toBeTruthy()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('rolls back and reports the failure', async () => {
    const onError = jest.fn()
    mockedSetForumPostHeart.mockRejectedValue(new Error('Could not add your heart.'))
    const screen = await render(
      <HeartButton
        postId="P1"
        hearted={false}
        count={2}
        onRequireSignIn={jest.fn()}
        onChanged={jest.fn()}
        onError={onError}
      />
    )

    await fireEvent.press(screen.getByRole('button', { name: 'Heart this' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Could not add your heart.'))
    expect(screen.getByText('2')).toBeTruthy()
  })

  it('asks for sign-in when signed out', async () => {
    const onRequireSignIn = jest.fn()
    mockedUseAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>)
    const screen = await render(
      <HeartButton
        postId="P1"
        hearted={false}
        count={0}
        onRequireSignIn={onRequireSignIn}
        onChanged={jest.fn()}
        onError={jest.fn()}
      />
    )

    await fireEvent.press(screen.getByRole('button', { name: 'Heart this' }))

    expect(onRequireSignIn).toHaveBeenCalledTimes(1)
    expect(mockedSetForumPostHeart).not.toHaveBeenCalled()
  })
})
