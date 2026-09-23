/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import ForumToolbar from '../ForumToolbar'
import type { ForumCategoryCounts } from '../../../services/forum'

const COUNTS: ForumCategoryCounts = {
  general: 0,
  planting: 3,
  pests: 0,
  harvesting: 0,
  storage: 0,
  quality: 0,
  market: 0,
}

function buildProps() {
  return {
    category: null,
    counts: COUNTS,
    countsError: '',
    search: '',
    onCategoryChange: jest.fn(),
    onSearchChange: jest.fn(),
    onRetryCounts: jest.fn(),
    onStartDiscussion: jest.fn(),
  }
}

describe('ForumToolbar', () => {
  it('renders search, create action, and counted category chips', async () => {
    const props = buildProps()
    const screen = await render(<ForumToolbar {...props} />)

    expect(screen.getByLabelText('Search discussions')).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'Start a discussion' }))
    expect(props.onStartDiscussion).toHaveBeenCalledTimes(1)

    expect(screen.getByRole('button', { name: 'All' })).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Planting & Growing, 3 discussions' })
    ).toBeTruthy()
  })

  it('reports a category selection', async () => {
    const props = buildProps()
    const screen = await render(<ForumToolbar {...props} />)

    await fireEvent.press(
      screen.getByRole('button', { name: 'Pests & Diseases, 0 discussions' })
    )

    expect(props.onCategoryChange).toHaveBeenCalledWith('pests')
  })

  it('reports search changes', async () => {
    const props = buildProps()
    const screen = await render(<ForumToolbar {...props} />)

    await fireEvent.changeText(screen.getByLabelText('Search discussions'), 'mold')

    expect(props.onSearchChange).toHaveBeenCalledWith('mold')
  })

  it('offers an inline retry when the counts fail', async () => {
    const props = {
      ...buildProps(),
      counts: null,
      countsError: 'Could not load categories. Please try again.',
    }
    const screen = await render(<ForumToolbar {...props} />)

    expect(screen.getByText('Category counts unavailable.')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }))

    expect(props.onRetryCounts).toHaveBeenCalledTimes(1)
  })
})
