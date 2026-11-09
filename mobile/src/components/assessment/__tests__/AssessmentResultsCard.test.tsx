/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import AssessmentResultsCard from '../AssessmentResultsCard'
import type { AssessmentData, DefectDetection } from '../../../types/api'

const HIGHER: DefectDetection = {
  class_key: 'mold_discoloration',
  label: 'Mold / discoloration',
  confidence: 0.82,
  box: [0.1, 0.1, 0.05, 0.05],
  area_ratio: 0.0025,
  needs_review: false,
}

const LOWER: DefectDetection = {
  ...HIGHER,
  confidence: 0.64,
  box: [0.4, 0.4, 0.05, 0.05],
  needs_review: true,
}

const DATA: AssessmentData = {
  available_outputs: ['mold', 'quality_status'],
  unavailable_outputs: ['market_grade', 'variety'],
  detections: [LOWER, HIGHER],
  counts: { mold_discoloration: 2 },
  defect_rate: 0.005,
  severity: 'low',
  severity_bands: { none_max: 0.0025, low_max: 0.01, moderate_max: 0.03 },
  quality_status: 'good',
  needs_review: true,
  review_confidence_threshold: 0.55,
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
  it('states the quality verdict with the coverage band that produced it', async () => {
    const screen = await renderCard()

    expect(screen.getByText('Good')).toBeTruthy()
    expect(screen.getByText('Low severity \u2014 0.25% to 1.00% coverage.')).toBeTruthy()
  })

  it('reports the flagged-area count and the photo coverage', async () => {
    const screen = await renderCard()

    expect(screen.getByTestId('stat-flagged-areas').props.children).toBe(2)
    expect(screen.getByText('Flagged areas')).toBeTruthy()
    expect(screen.getByTestId('stat-coverage').props.children).toBe('0.50%')
    expect(screen.getByText('Photo coverage')).toBeTruthy()
    expect(
      screen.getByText(
        'Coverage is the share of the photo inside the flagged areas \u2014 not the share of grains affected.'
      )
    ).toBeTruthy()
  })

  it('ranks the listed areas by confidence and names the low-confidence ones', async () => {
    const screen = await renderCard()

    const areas = screen.getAllByLabelText(/^Area /)
    expect(areas[0].props.accessibilityLabel).toBe(
      'Area 1, Mold / discoloration, 82% confidence'
    )
    expect(areas[1].props.accessibilityLabel).toBe(
      'Area 2, Mold / discoloration, 64% confidence, flagged for review'
    )
    expect(screen.getByText('Low confidence')).toBeTruthy()
  })

  it('moves the photo highlight when a listed area is selected', async () => {
    const screen = await renderCard()

    const before = screen.getAllByTestId('detection-box').map((box) => {
      return StyleSheet.flatten(box.props.style).borderWidth
    })
    expect(before[0]).toBe(2)
    expect(before[1]).toBe(1)

    await fireEvent.press(
      screen.getByLabelText('Area 2, Mold / discoloration, 64% confidence, flagged for review')
    )

    const after = screen.getAllByTestId('detection-box').map((box) => {
      return StyleSheet.flatten(box.props.style).borderWidth
    })
    expect(after[0]).toBe(1)
    expect(after[1]).toBe(2)
  })

  it('names the detections it does not list', async () => {
    const detections = Array.from({ length: 6 }, (_unused, index) => ({
      ...HIGHER,
      confidence: 0.9 - index * 0.05,
    }))
    const screen = await renderCard({ detections })

    expect(screen.getByText('1 more flagged area outlined above.')).toBeTruthy()
  })

  it('flags low-confidence detections for review', async () => {
    const screen = await renderCard()

    expect(
      screen.getByText(
        '1 of 2 flagged areas fall below 55% confidence. Check it before using this result.'
      )
    ).toBeTruthy()
  })

  it('reports a clean read when every detection clears the threshold', async () => {
    const screen = await renderCard({
      detections: [HIGHER],
      counts: { mold_discoloration: 1 },
      needs_review: false,
    })

    expect(
      screen.getByText('All 1 flagged area passes the 55% confidence threshold.')
    ).toBeTruthy()
  })

  it('reports an empty sample plainly', async () => {
    const screen = await renderCard({
      detections: [],
      counts: { mold_discoloration: 0 },
      defect_rate: 0,
      severity: 'none',
      quality_status: 'premium',
      needs_review: false,
    })

    expect(
      screen.getByText('No mold or discoloration detected in this sample.')
    ).toBeTruthy()
    expect(screen.getByText('Clear coverage \u2014 0.25% or less.')).toBeTruthy()
    expect(screen.queryAllByTestId('detection-box')).toHaveLength(0)
  })

  it('names the outputs this model cannot produce', async () => {
    const screen = await renderCard()

    expect(
      screen.getByText('Not available from this model yet: Market grade, Variety.')
    ).toBeTruthy()
  })

  it('asks for another photo', async () => {
    const onRetake = jest.fn()
    const screen = await renderCard({}, onRetake)

    await fireEvent.press(screen.getByText('Assess another photo'))

    expect(onRetake).toHaveBeenCalledTimes(1)
  })
})
