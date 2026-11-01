/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import ScanModeTabs from '../ScanModeTabs'

describe('ScanModeTabs', () => {
  it('marks the active mode as selected', async () => {
    const screen = await render(<ScanModeTabs mode="sheet" onChange={jest.fn()} />)

    expect(screen.getByRole('tab', { name: 'Sheet scan' }).props.accessibilityState).toMatchObject(
      { selected: true }
    )
    expect(
      screen.getByRole('tab', { name: 'Grain photo' }).props.accessibilityState
    ).toMatchObject({ selected: false })
  })

  it('reports the mode the user tapped', async () => {
    const onChange = jest.fn()
    const screen = await render(<ScanModeTabs mode="sheet" onChange={onChange} />)

    await fireEvent.press(screen.getByRole('tab', { name: 'Grain photo' }))

    expect(onChange).toHaveBeenCalledWith('grain')
  })
})
