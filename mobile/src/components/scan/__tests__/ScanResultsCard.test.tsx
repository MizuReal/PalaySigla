/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import ScanResultsCard from '../ScanResultsCard'
import type { ScanFieldResult } from '../../../types/api'

const FIELDS: ScanFieldResult[] = [
  {
    key: 'grain_length',
    label: 'Grain length',
    unit: 'mm',
    value: 7.12,
    needs_review: false,
    confidence: 0.95,
    digits: [],
  },
  {
    key: 'grain_width',
    label: 'Grain width',
    unit: 'mm',
    value: 2.34,
    needs_review: false,
    confidence: 0.94,
    digits: [],
  },
  {
    key: 'length_width_ratio',
    label: 'Length-to-width ratio',
    unit: '',
    value: 3.05,
    needs_review: false,
    confidence: 0.93,
    digits: [],
  },
]

function renderCard(overrides: {
  fields?: ScanFieldResult[]
  overallNeedsReview?: boolean
  onChangeValue?: jest.Mock
  onRetake?: jest.Mock
} = {}) {
  return render(
    <ScanResultsCard
      fields={overrides.fields ?? FIELDS}
      computedRatio={3.04}
      overallNeedsReview={overrides.overallNeedsReview ?? false}
      onChangeValue={overrides.onChangeValue ?? jest.fn()}
      onRetake={overrides.onRetake ?? jest.fn()}
    />
  )
}

describe('ScanResultsCard', () => {
  it('renders the clean banner, field values, and computed ratio', async () => {
    const screen = await renderCard()

    expect(screen.getByText('All six values read cleanly.')).toBeTruthy()
    expect(screen.getByText('3.04')).toBeTruthy()
    expect(screen.getByLabelText('Grain length in mm').props.value).toBe('7.12')
  })

  it('reports edits as parsed numbers and clears on empty input', async () => {
    const onChangeValue = jest.fn()
    const screen = await renderCard({ onChangeValue })

    await fireEvent.changeText(screen.getByLabelText('Grain length in mm'), '7.5')
    expect(onChangeValue).toHaveBeenCalledWith('grain_length', 7.5)

    await fireEvent.changeText(screen.getByLabelText('Grain length in mm'), '')
    expect(onChangeValue).toHaveBeenCalledWith('grain_length', null)
  })

  it('shows the review banner and chips, and retakes on demand', async () => {
    const onRetake = jest.fn()
    const flagged = FIELDS.map((field) =>
      field.key === 'grain_width' ? { ...field, needs_review: true } : field
    )
    const screen = await renderCard({ fields: flagged, overallNeedsReview: true, onRetake })

    expect(
      screen.getByText('Some values need your review. Check the flagged fields.')
    ).toBeTruthy()
    expect(screen.getByText('Review')).toBeTruthy()

    await fireEvent.press(screen.getByRole('button', { name: 'Scan another sheet' }))
    expect(onRetake).toHaveBeenCalledTimes(1)
  })
})
