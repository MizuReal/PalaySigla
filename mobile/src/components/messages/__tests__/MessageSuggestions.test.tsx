/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import MessageSuggestions from '../MessageSuggestions'
import { INQUIRY_SUGGESTIONS } from '../../../utils/messageSuggestions'

describe('MessageSuggestions', () => {
  it('renders every opener suggestion', async () => {
    const screen = await render(<MessageSuggestions onSelect={jest.fn()} />)
    for (const suggestion of INQUIRY_SUGGESTIONS) {
      expect(screen.getByText(suggestion)).toBeTruthy()
    }
  })

  it('calls onSelect with the tapped question', async () => {
    const onSelect = jest.fn()
    const screen = await render(<MessageSuggestions onSelect={onSelect} />)

    await fireEvent.press(screen.getByText('Is this negotiable?'))

    expect(onSelect).toHaveBeenCalledWith('Is this negotiable?')
  })

  it('blocks selection while disabled', async () => {
    const onSelect = jest.fn()
    const screen = await render(<MessageSuggestions onSelect={onSelect} disabled />)

    await fireEvent.press(screen.getByText(INQUIRY_SUGGESTIONS[0]))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
