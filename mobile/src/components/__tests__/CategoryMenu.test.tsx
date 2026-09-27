/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import CategoryMenu from '../CategoryMenu'
import type { CategoryMenuOption } from '../CategoryMenu'

const OPTIONS: CategoryMenuOption[] = [
  { id: 'all', label: 'All categories' },
  { id: 'rice', label: 'Rice', icon: 'grain', accent: '#0f766e', count: 3 },
  { id: 'machinery', label: 'Machinery', icon: 'tractor', accent: '#1e4fa3' },
]

async function renderMenu(value = 'all', onChange = jest.fn()) {
  const screen = await render(
    <CategoryMenu
      ariaLabel="Filter by category"
      value={value}
      options={OPTIONS}
      onChange={onChange}
    />
  )
  return { screen, onChange }
}

describe('CategoryMenu', () => {
  it('shows the active option and reveals every option on press', async () => {
    const { screen } = await renderMenu()

    expect(screen.getByLabelText('Filter by category: All categories')).toBeTruthy()
    expect(screen.queryByText('Rice')).toBeNull()

    await fireEvent.press(screen.getByLabelText('Filter by category: All categories'))

    expect(screen.getByText('Rice')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('reflects the selected value on the closed field', async () => {
    const { screen } = await renderMenu('machinery')
    expect(screen.getByLabelText('Filter by category: Machinery')).toBeTruthy()
  })

  it('selects an option and closes the sheet', async () => {
    const { screen, onChange } = await renderMenu()

    await fireEvent.press(screen.getByLabelText('Filter by category: All categories'))
    await fireEvent.press(screen.getByText('Rice'))

    expect(onChange).toHaveBeenCalledWith('rice')
    expect(screen.queryByText('Rice')).toBeNull()
  })
})
