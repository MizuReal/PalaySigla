/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import ReplyButton from '../ReplyButton'

describe('ReplyButton', () => {
  it('shows the count and fires onPress', async () => {
    const onPress = jest.fn()
    const screen = await render(<ReplyButton count={3} onPress={onPress} />)

    expect(screen.getByLabelText('View 3 replies')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'View 3 replies' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('uses the singular label for one reply', async () => {
    const screen = await render(<ReplyButton count={1} onPress={jest.fn()} />)

    expect(screen.getByLabelText('View 1 reply')).toBeTruthy()
  })

  it('renders zero replies', async () => {
    const screen = await render(<ReplyButton count={0} onPress={jest.fn()} />)

    expect(screen.getByLabelText('View 0 replies')).toBeTruthy()
  })
})
