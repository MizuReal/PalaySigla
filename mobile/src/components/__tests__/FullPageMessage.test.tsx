/// <reference types="jest" />
import { Text } from 'react-native'
import { render } from '@testing-library/react-native'
import FullPageMessage from '../FullPageMessage'

describe('FullPageMessage', () => {
  it('renders the title, message, and actions', async () => {
    const screen = await render(
      <FullPageMessage title="Page not found." message="Nowhere to go.">
        <Text>Action</Text>
      </FullPageMessage>
    )

    expect(screen.getByText('Page not found.')).toBeTruthy()
    expect(screen.getByText('Nowhere to go.')).toBeTruthy()
    expect(screen.getByText('Action')).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('marks the error tone as an alert', async () => {
    const screen = await render(
      <FullPageMessage tone="error" icon="info" title="Something went wrong." message="Try again." />
    )

    expect(screen.getByRole('alert')).toBeTruthy()
  })
})
