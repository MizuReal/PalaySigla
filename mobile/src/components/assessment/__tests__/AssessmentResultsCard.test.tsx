/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import AssessmentResultsCard from '../AssessmentResultsCard'
import type { AssessmentData } from '../../../types/api'

const DATA: AssessmentData = {
  available_outputs: ['mold', 'quality_status'],
  unavailable_outputs: ['market_grade', 'variety'],
  detections: [
    {
      class_key: 'mold_discoloration',
      label: 'Mold / discoloration',
      confidence: 0.82,
      box: [0.1, 0.1, 0.05, 0.05],
      area_ratio: 0.0025,
    },
    {
      class_key: 'mold_discoloration',
      label: 'Mold / discoloration',
      confidence: 0.64,
      box: [0.4, 0.4, 0.05, 0.05],
      area_ratio: 0.0025,
    },
  ],
  counts: { mold_discoloration: 2 },
  defect_rate: 0.005,
  severity: 'low',
  quality_status: 'good',
  needs_review: false,
  inference_ms: 720,
  imgsz: 1280,
}

function renderCard(overrides: Partial<AssessmentData> = {}, onRetake = jest.fn()) {
  return render(
    <AssessmentResultsCard
      data={{ ...DATA, ...overrides }}
      imageUri="file:///cache/paddy.jpg"
      imageWidth={1280}
      imageHeight={1280}
      onRetake={onRetake}
    />
  )
}

describe('AssessmentResultsCard', () => {
  it('shows the defect count, coverage, severity, and quality status', async () => {
    const screen = await renderCard()

    expect(screen.getByText('Defects found')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('0.5%')).toBeTruthy()
    expect(screen.getByText('Low')).toBeTruthy()
    expect(screen.getByText('Good')).toBeTruthy()
  })

  it('names the outputs this model cannot produce', async () => {
    const screen = await renderCard()

    expect(
      screen.getByText('Not available from this model yet: Market grade, Variety.')
    ).toBeTruthy()
  })

  it('flags low-confidence detections for review', async () => {
    const screen = await renderCard({ needs_review: true })

    expect(
      screen.getByText('Some detections are low-confidence. Check the outlined grains.')
    ).toBeTruthy()
  })

  it('reports a clean read when nothing needs review', async () => {
    const screen = await renderCard()

    expect(screen.getByText('No defects needed review on this sample.')).toBeTruthy()
  })

  it('asks for another photo', async () => {
    const onRetake = jest.fn()
    const screen = await renderCard({}, onRetake)

    await fireEvent.press(screen.getByText('Assess another photo'))

    expect(onRetake).toHaveBeenCalledTimes(1)
  })
})
