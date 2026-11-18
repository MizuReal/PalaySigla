/// <reference types="jest" />
import { fireEvent, render } from '@testing-library/react-native'

jest.mock('../../../hooks/useChatSheetBottomGap', () => ({
  useChatSheetBottomGap: () => 100,
}))

import AssessmentAdviceSheet from '../AssessmentAdviceSheet'
import type { UseAssessmentAdviceResult } from '../../../hooks/useAssessmentAdvice'
import type { AssessmentData } from '../../../types/api'

const OPENING = 'Mukhang may kaunting amag. Tuyuin muna bago iimbak.'

const ASSESSMENT: AssessmentData = {
  available_outputs: ['mold', 'quality_status'],
  unavailable_outputs: ['market_grade', 'variety'],
  detections: [
    {
      class_key: 'mold_discoloration',
      label: 'Mold / discoloration',
      confidence: 0.82,
      box: [0.1, 0.1, 0.05, 0.05],
      area_ratio: 0.0025,
      needs_review: false,
    },
    {
      class_key: 'mold_discoloration',
      label: 'Mold / discoloration',
      confidence: 0.64,
      box: [0.4, 0.4, 0.05, 0.05],
      area_ratio: 0.0025,
      needs_review: true,
    },
  ],
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

function makeAdvice(
  overrides: Partial<UseAssessmentAdviceResult> = {}
): UseAssessmentAdviceResult {
  return {
    language: 'english',
    opening: OPENING,
    messages: [{ role: 'assistant', content: OPENING }],
    status: 'ready',
    isWaiting: false,
    errorMessage: null,
    failedContent: null,
    hasFollowUps: false,
    setLanguage: jest.fn(),
    submitMessage: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn(),
    ...overrides,
  }
}

async function renderSheet(
  advice: UseAssessmentAdviceResult,
  onClose = jest.fn()
) {
  return {
    view: await render(
      <AssessmentAdviceSheet
        visible
        onClose={onClose}
        assessment={ASSESSMENT}
        advice={advice}
      />
    ),
    advice,
    onClose,
  }
}

describe('AssessmentAdviceSheet', () => {
  it('shows the scan summary and the opening analysis', async () => {
    const { view } = await renderSheet(makeAdvice())

    expect(view.getByText('PalaySigla Assistant')).toBeTruthy()
    expect(view.getByText('Good · Low severity · 2 flagged areas')).toBeTruthy()
    expect(view.getByText(OPENING)).toBeTruthy()
    expect(view.getByText('How do I prevent mold during storage?')).toBeTruthy()
  })

  it('sends a starter question', async () => {
    const { view, advice } = await renderSheet(makeAdvice())

    await fireEvent.press(view.getByText('How do I prevent mold during storage?'))

    expect(advice.submitMessage).toHaveBeenCalledWith(
      'How do I prevent mold during storage?'
    )
  })

  it('sends a typed follow-up', async () => {
    const { view, advice } = await renderSheet(makeAdvice())

    await fireEvent.changeText(view.getByLabelText('Message'), 'Bakit?')
    await fireEvent.press(view.getByLabelText('Send message'))

    expect(advice.submitMessage).toHaveBeenCalledWith('Bakit?')
  })

  it('shows the loading state while the opening is generated', async () => {
    const { view } = await renderSheet(
      makeAdvice({ status: 'loading', opening: null, messages: [] })
    )

    expect(view.getByText('Analyzing this result…')).toBeTruthy()
    expect(view.getByLabelText('The assistant is typing')).toBeTruthy()
  })

  it('shows a retry when the opening fails', async () => {
    const { view, advice } = await renderSheet(
      makeAdvice({
        status: 'error',
        opening: null,
        messages: [],
        errorMessage: 'The analysis is unavailable.',
      })
    )

    expect(view.getByText('The analysis is unavailable.')).toBeTruthy()
    await fireEvent.press(view.getByText('Try again'))
    expect(advice.retry).toHaveBeenCalledTimes(1)
  })

  it('hides starters and the language toggle after a follow-up', async () => {
    const { view } = await renderSheet(
      makeAdvice({
        hasFollowUps: true,
        messages: [
          { role: 'assistant', content: OPENING },
          { role: 'user', content: 'Bakit?' },
        ],
      })
    )

    expect(view.queryByText('How do I prevent mold during storage?')).toBeNull()
    expect(view.queryByLabelText('Show the analysis in Tagalog')).toBeNull()
  })

  it('closes the sheet', async () => {
    const { view, onClose } = await renderSheet(makeAdvice())

    await fireEvent.press(view.getAllByLabelText('Close analysis')[0])

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
