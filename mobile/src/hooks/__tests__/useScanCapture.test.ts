/// <reference types="jest" />
import { act, renderHook, waitFor } from '@testing-library/react-native'

jest.mock('../useImagePicker', () => ({ __esModule: true, default: jest.fn() }))
jest.mock('../../services/scan', () => ({ sendScanImage: jest.fn() }))

import useImagePicker from '../useImagePicker'
import { sendScanImage } from '../../services/scan'
import useScanCapture from '../useScanCapture'
import type { ScanData, ScanFieldResult } from '../../types/api'
import type { PreparedImage } from '../../utils/image'

const IMAGE: PreparedImage = {
  uri: 'file:///cache/scan.jpg',
  width: 2400,
  height: 1800,
  base64: 'ZmFrZQ==',
}

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
    value: 3.04,
    needs_review: false,
    confidence: 0.93,
    digits: [],
  },
]

const SCAN_DATA: ScanData = {
  computed_ratio: 3.0427,
  overall_needs_review: false,
  fields: FIELDS,
}

function pickerResult(image: PreparedImage | null) {
  return {
    image,
    isProcessing: false,
    error: '',
    canOpenSettings: false,
    takePhoto: jest.fn(),
    pickFromLibrary: jest.fn(),
    removeImage: jest.fn(),
    openSettings: jest.fn(),
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  jest.mocked(useImagePicker).mockReturnValue(pickerResult(null))
  jest.mocked(sendScanImage).mockResolvedValue(SCAN_DATA)
})

describe('useScanCapture', () => {
  it('uploads a captured image and exposes the review model', async () => {
    jest.mocked(useImagePicker).mockReturnValue(pickerResult(IMAGE))

    const { result } = await renderHook(() => useScanCapture())

    await waitFor(() => expect(result.current.status).toBe('review'))
    expect(sendScanImage).toHaveBeenCalledWith(IMAGE)
    expect(result.current.fields).toEqual(FIELDS)
    expect(result.current.computedRatio).toBeCloseTo(3.0427, 4)
    expect(result.current.overallNeedsReview).toBe(false)
  })

  it('rejects the scan when the backend cannot find a sheet', async () => {
    jest.mocked(useImagePicker).mockReturnValue(pickerResult(IMAGE))
    jest.mocked(sendScanImage).mockRejectedValue(new Error('No sheet found.'))

    const { result } = await renderHook(() => useScanCapture())

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe('No sheet found.')
  })

  it('flags the ratio when edited dimensions disagree', async () => {
    jest.mocked(useImagePicker).mockReturnValue(pickerResult(IMAGE))
    const { result } = await renderHook(() => useScanCapture())
    await waitFor(() => expect(result.current.status).toBe('review'))

    await act(() => result.current.updateFieldValue('grain_length', 9))

    const ratio = result.current.fields.find((field) => field.key === 'length_width_ratio')
    expect(ratio?.needs_review).toBe(true)
    expect(result.current.computedRatio).toBeCloseTo(9 / 2.34, 4)
    expect(result.current.overallNeedsReview).toBe(true)
  })

  it('clears state on reset', async () => {
    const picker = pickerResult(IMAGE)
    jest.mocked(useImagePicker).mockReturnValue(picker)
    const { result } = await renderHook(() => useScanCapture())
    await waitFor(() => expect(result.current.status).toBe('review'))

    await act(() => result.current.reset())

    expect(picker.removeImage).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('idle')
    expect(result.current.fields).toEqual([])
  })
})
