/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import StarRatingInput from '../StarRatingInput'

describe('StarRatingInput', () => {
  it('calls onChange with the tapped rating', async () => {
    const onChange = jest.fn()
    const screen = await render(<StarRatingInput value={0} onChange={onChange} />)

    await fireEvent.press(screen.getByLabelText('4 stars'))

    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('shows 0 / 5 before a rating is chosen', async () => {
    const screen = await render(<StarRatingInput value={0} onChange={jest.fn()} />)
    expect(screen.getByText('0 / 5')).toBeTruthy()
  })

  it('shows the selected ratio', async () => {
    const screen = await render(<StarRatingInput value={3} onChange={jest.fn()} />)
    expect(screen.getByText('3 / 5')).toBeTruthy()
  })
})
