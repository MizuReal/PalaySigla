/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

jest.mock('../../services/assessmentAdvice', () => ({
  sendAssessmentAdvice: jest.fn(),
}))

import { sendAssessmentAdvice } from '../../services/assessmentAdvice'
import useAssessmentAdvice from '../useAssessmentAdvice'
import type { AssessmentData } from '../../types/api'

const mockedSend = jest.mocked(sendAssessmentAdvice)

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

const OPENING = { reply: 'Mukhang may kaunting amag. Tuyuin muna.' }
const TAGALOG_OPENING = { reply: 'Mukhang may kaunting amag. Patuyuin muna.' }

beforeEach(async () => {
  jest.clearAllMocks()
  mockedSend.mockReset()
  await AsyncStorage.clear()
  mockedSend.mockResolvedValue(OPENING)
})

describe('useAssessmentAdvice', () => {
  it('loads the opening analysis with the scan context', async () => {
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(mockedSend).toHaveBeenCalledWith(
      {
        assessment: {
          defect_rate: 0.005,
          counts: { mold_discoloration: 2 },
          highest_confidence: 0.82,
          lowest_confidence: 0.64,
        },
        messages: [],
        language: 'english',
      },
      expect.any(AbortSignal)
    )
    expect(result.current.opening).toBe(OPENING.reply)
    expect(result.current.messages).toEqual([
      { role: 'assistant', content: OPENING.reply },
    ])
  })

  it('switches the opening language and remembers the preference', async () => {
    mockedSend
      .mockResolvedValueOnce(OPENING)
      .mockResolvedValueOnce(TAGALOG_OPENING)
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(() => result.current.setLanguage('tagalog'))

    await waitFor(() => expect(result.current.opening).toBe(TAGALOG_OPENING.reply))
    expect(result.current.language).toBe('tagalog')
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'palaysigla:assessment-advice-language:user-1',
      'tagalog'
    )
  })

  it('uses the stored language for the opening request', async () => {
    await AsyncStorage.setItem(
      'palaysigla:assessment-advice-language:user-1',
      'tagalog'
    )
    mockedSend.mockResolvedValue(TAGALOG_OPENING)

    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'tagalog' }),
      expect.any(AbortSignal)
    )
    expect(result.current.opening).toBe(TAGALOG_OPENING.reply)
  })

  it('sends a follow-up with the opening and user turns', async () => {
    mockedSend
      .mockResolvedValueOnce(OPENING)
      .mockResolvedValueOnce({ reply: 'Patuyuin hanggang 14% moisture.' })
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.submitMessage('Paano ko ito iimbak?')
    })

    expect(result.current.messages).toEqual([
      { role: 'assistant', content: OPENING.reply },
      { role: 'user', content: 'Paano ko ito iimbak?' },
      { role: 'assistant', content: 'Patuyuin hanggang 14% moisture.' },
    ])
    expect(mockedSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'assistant', content: OPENING.reply },
          { role: 'user', content: 'Paano ko ito iimbak?' },
        ],
      }),
      expect.any(AbortSignal)
    )
  })

  it('keeps the failed turn visible and retries it', async () => {
    mockedSend
      .mockResolvedValueOnce(OPENING)
      .mockRejectedValueOnce(new Error('The assistant is busy.'))
      .mockResolvedValueOnce({ reply: 'Sagot na.' })
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.submitMessage('Bakit?')
    })

    expect(result.current.failedContent).toBe('Bakit?')
    expect(result.current.errorMessage).toBe('The assistant is busy.')
    expect(result.current.messages).toHaveLength(2)

    await act(async () => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.messages).toHaveLength(3))
    expect(mockedSend).toHaveBeenLastCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'assistant', content: OPENING.reply },
          { role: 'user', content: 'Bakit?' },
        ],
      }),
      expect.any(AbortSignal)
    )
  })

  it('retries a failed opening analysis', async () => {
    mockedSend
      .mockRejectedValueOnce(new Error('The analysis is unavailable.'))
      .mockResolvedValueOnce(OPENING)
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.errorMessage).toBe('The analysis is unavailable.')

    await act(async () => {
      result.current.retry()
    })

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.opening).toBe(OPENING.reply)
  })

  it('does not switch language after a follow-up has been sent', async () => {
    mockedSend
      .mockResolvedValueOnce(OPENING)
      .mockResolvedValueOnce({ reply: 'Sagot.' })
    const { result } = await renderHook(() => useAssessmentAdvice(ASSESSMENT, 'user-1'))
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await act(async () => {
      await result.current.submitMessage('Bakit?')
    })

    await act(() => result.current.setLanguage('tagalog'))

    expect(result.current.language).toBe('english')
    expect(mockedSend).toHaveBeenCalledTimes(2)
  })

  it('returns the idle state when no assessment is present', async () => {
    const { result } = await renderHook(() => useAssessmentAdvice(null, 'user-1'))

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.messages).toEqual([])
    expect(mockedSend).not.toHaveBeenCalled()
  })

  it('clears the visible conversation when the assessment resets', async () => {
    const { result, rerender } = await renderHook(
      ({ assessment }: { assessment: AssessmentData | null }) =>
        useAssessmentAdvice(assessment, 'user-1'),
      { initialProps: { assessment: ASSESSMENT } }
    )
    await waitFor(() => expect(result.current.status).toBe('ready'))

    rerender({ assessment: null })

    await waitFor(() => expect(result.current.status).toBe('idle'))
    expect(result.current.messages).toEqual([])
    expect(result.current.opening).toBeNull()
  })
})
