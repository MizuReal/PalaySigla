/// <reference types="jest" />
import { Linking } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'

const mockRequestCameraPermissionsAsync = jest.fn()
const mockLaunchCameraAsync = jest.fn()
const mockLaunchImageLibraryAsync = jest.fn()
const mockGetPendingResultAsync = jest.fn()
const mockCompressImage = jest.fn()

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: (...args: unknown[]) =>
    mockRequestCameraPermissionsAsync(...args),
  launchCameraAsync: (...args: unknown[]) => mockLaunchCameraAsync(...args),
  launchImageLibraryAsync: (...args: unknown[]) =>
    mockLaunchImageLibraryAsync(...args),
  getPendingResultAsync: (...args: unknown[]) => mockGetPendingResultAsync(...args),
  UIImagePickerPreferredAssetRepresentationMode: { Compatible: 'compatible' },
}))

jest.mock('../../utils/image', () => ({
  validateImageAsset: jest.requireActual<typeof import('../../utils/image')>(
    '../../utils/image'
  ).validateImageAsset,
  compressImage: (...args: unknown[]) => mockCompressImage(...args),
}))

import useImagePicker from '../useImagePicker'

const ASSET = {
  uri: 'file:///camera/original.jpg',
  width: 800,
  height: 600,
  mimeType: 'image/jpeg',
  fileSize: 2_000_000,
}

const PREPARED = {
  uri: 'file:///cache/prepared.jpg',
  width: 800,
  height: 600,
}

beforeEach(() => {
  mockRequestCameraPermissionsAsync.mockReset()
  mockLaunchCameraAsync.mockReset()
  mockLaunchImageLibraryAsync.mockReset()
  mockGetPendingResultAsync.mockReset()
  mockCompressImage.mockReset()

  mockRequestCameraPermissionsAsync.mockResolvedValue({
    granted: true,
    canAskAgain: true,
  })
  mockLaunchCameraAsync.mockResolvedValue({ canceled: true, assets: null })
  mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null })
  mockGetPendingResultAsync.mockResolvedValue(null)
  mockCompressImage.mockResolvedValue(PREPARED)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('pickFromLibrary', () => {
  it('validates, compresses, and exposes the prepared image', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [ASSET],
    })
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.pickFromLibrary())

    expect(mockCompressImage).toHaveBeenCalledWith(ASSET)
    expect(result.current.image).toEqual(PREPARED)
    expect(result.current.error).toBe('')
    expect(result.current.isProcessing).toBe(false)
  })

  it('treats a canceled pick as a no-op', async () => {
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.pickFromLibrary())

    expect(mockCompressImage).not.toHaveBeenCalled()
    expect(result.current.image).toBeNull()
    expect(result.current.error).toBe('')
  })

  it('rejects non-JPEG/PNG assets before compressing', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ ...ASSET, mimeType: 'image/heic' }],
    })
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.pickFromLibrary())

    expect(mockCompressImage).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Please choose a JPEG or PNG photo.')
  })

  it('surfaces compression failures', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [ASSET],
    })
    mockCompressImage.mockRejectedValue(new Error('Could not process the photo.'))
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.pickFromLibrary())

    expect(result.current.error).toBe('Could not process the photo.')
    expect(result.current.image).toBeNull()
  })

  it('reports picker launch failures', async () => {
    mockLaunchImageLibraryAsync.mockRejectedValue(new Error('native failure'))
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.pickFromLibrary())

    expect(result.current.error).toBe(
      'Could not open the photo picker. Please try again.'
    )
  })
})

describe('takePhoto', () => {
  it('launches the camera once permission is granted', async () => {
    mockLaunchCameraAsync.mockResolvedValue({ canceled: false, assets: [ASSET] })
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.takePhoto())

    expect(mockRequestCameraPermissionsAsync).toHaveBeenCalledTimes(1)
    expect(mockLaunchCameraAsync).toHaveBeenCalledTimes(1)
    expect(result.current.image).toEqual(PREPARED)
  })

  it('explains a denial that can be asked again and never launches', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: true,
    })
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.takePhoto())

    expect(mockLaunchCameraAsync).not.toHaveBeenCalled()
    expect(result.current.error).toBe(
      'Camera access was denied. You can still choose a photo from your library.'
    )
    expect(result.current.canOpenSettings).toBe(false)
  })

  it('offers Settings when the permission is permanently denied', async () => {
    mockRequestCameraPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    })
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.takePhoto())

    expect(result.current.error).toBe(
      'Camera access is off. Enable it in Settings to take a photo, or choose one from your library.'
    )
    expect(result.current.canOpenSettings).toBe(true)
  })
})

describe('recovery and reset', () => {
  it('recovers a pending Android capture on mount', async () => {
    mockGetPendingResultAsync.mockResolvedValue({
      canceled: false,
      assets: [ASSET],
    })

    const { result } = await renderHook(() => useImagePicker())

    await waitFor(() => expect(result.current.image).toEqual(PREPARED))
    expect(mockCompressImage).toHaveBeenCalledWith(ASSET)
  })

  it('clears the image and errors on remove', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [ASSET],
    })
    const { result } = await renderHook(() => useImagePicker())
    await act(() => result.current.pickFromLibrary())

    await act(() => result.current.removeImage())

    expect(result.current.image).toBeNull()
    expect(result.current.error).toBe('')
    expect(result.current.canOpenSettings).toBe(false)
  })

  it('opens the OS settings and swallows platform failures', async () => {
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined)
    const { result } = await renderHook(() => useImagePicker())

    await act(() => result.current.openSettings())
    expect(openSettings).toHaveBeenCalledTimes(1)

    openSettings.mockRejectedValue(new Error('not supported'))
    await expect(act(() => result.current.openSettings())).resolves.toBeUndefined()
  })
})
