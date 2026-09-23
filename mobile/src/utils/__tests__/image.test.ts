/// <reference types="jest" />
const mockResize = jest.fn()
const mockRenderAsync = jest.fn()
const mockSaveAsync = jest.fn()
const mockManipulate = jest.fn()
const mockDecode = jest.fn()

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: (...args: unknown[]) => mockManipulate(...args),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}))

jest.mock('base64-arraybuffer', () => ({
  decode: (...args: unknown[]) => mockDecode(...args),
}))

import {
  compressImage,
  decodePreparedImage,
  MAX_AVATAR_DIMENSION,
  MAX_IMAGE_BYTES,
  validateImageAsset,
} from '../image'
import type { PickedImageAsset, PreparedImage } from '../image'

const BASE64 = 'ZmFrZQ=='

const ASSET: PickedImageAsset = {
  uri: 'file:///camera/original.jpg',
  width: 800,
  height: 600,
  mimeType: 'image/jpeg',
  fileSize: 2_000_000,
}

const PREPARED: PreparedImage = {
  uri: 'file:///cache/prepared.jpg',
  width: 800,
  height: 600,
  base64: BASE64,
}

beforeEach(() => {
  mockResize.mockReset()
  mockRenderAsync.mockReset()
  mockSaveAsync.mockReset()
  mockManipulate.mockReset()
  mockDecode.mockReset()

  mockManipulate.mockReturnValue({ resize: mockResize, renderAsync: mockRenderAsync })
  mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync })
  mockSaveAsync.mockResolvedValue({
    uri: 'file:///cache/prepared.jpg',
    width: 1600,
    height: 1200,
    base64: BASE64,
  })
  mockDecode.mockReturnValue(new ArrayBuffer(4))
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('validateImageAsset', () => {
  it('accepts JPEG and PNG photos', () => {
    expect(validateImageAsset({ ...ASSET, mimeType: 'image/jpeg' })).toBe('')
    expect(validateImageAsset({ ...ASSET, mimeType: 'image/png' })).toBe('')
  })

  it('accepts assets whose mime type the OS did not report', () => {
    expect(validateImageAsset({ ...ASSET, mimeType: undefined })).toBe('')
  })

  it('rejects other image formats', () => {
    expect(validateImageAsset({ ...ASSET, mimeType: 'image/heic' })).toBe(
      'Please choose a JPEG or PNG photo.'
    )
  })

  it('does not cap the original size; compression bounds the upload instead', () => {
    expect(validateImageAsset({ ...ASSET, fileSize: MAX_IMAGE_BYTES * 3 })).toBe('')
  })
})

describe('compressImage', () => {
  it('downscales a large landscape photo and returns the base64 JPEG payload', async () => {
    await expect(
      compressImage({ ...ASSET, width: 3000, height: 2000 })
    ).resolves.toEqual({
      uri: 'file:///cache/prepared.jpg',
      width: 1600,
      height: 1200,
      base64: BASE64,
    })

    expect(mockManipulate).toHaveBeenCalledWith(ASSET.uri)
    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: null })
    expect(mockSaveAsync).toHaveBeenCalledWith({
      format: 'jpeg',
      compress: 0.82,
      base64: true,
    })
  })

  it('downscales a large portrait photo on its long edge', async () => {
    await compressImage({ ...ASSET, width: 2000, height: 3000 })

    expect(mockResize).toHaveBeenCalledWith({ width: null, height: 1600 })
  })

  it('honors a caller-supplied max dimension for avatars', async () => {
    await compressImage({ ...ASSET, width: 2000, height: 3000 }, MAX_AVATAR_DIMENSION)

    expect(mockResize).toHaveBeenCalledWith({ width: null, height: MAX_AVATAR_DIMENSION })
  })

  it('re-encodes without resizing when the photo already fits', async () => {
    await compressImage(ASSET)

    expect(mockResize).not.toHaveBeenCalled()
    expect(mockSaveAsync).toHaveBeenCalledWith({
      format: 'jpeg',
      compress: 0.82,
      base64: true,
    })
  })

  it('fails when the manipulator returns no base64 payload', async () => {
    mockSaveAsync.mockResolvedValue({
      uri: 'file:///cache/prepared.jpg',
      width: 800,
      height: 600,
    })

    await expect(compressImage(ASSET)).rejects.toThrow('Could not process the photo.')
  })

  it('reports processing failures', async () => {
    mockSaveAsync.mockRejectedValue(new Error('native failure'))

    await expect(compressImage(ASSET)).rejects.toThrow('Could not process the photo.')
  })
})

describe('decodePreparedImage', () => {
  it('decodes the base64 payload into upload bytes', () => {
    const bytes = decodePreparedImage(PREPARED)

    expect(mockDecode).toHaveBeenCalledWith(BASE64)
    expect(bytes.byteLength).toBe(4)
  })

  it('rejects an empty payload', () => {
    mockDecode.mockReturnValue(new ArrayBuffer(0))

    expect(() => decodePreparedImage(PREPARED)).toThrow(
      'The photo could not be read. Please choose it again.'
    )
  })

  it('rejects payloads over the 10 MB cap', () => {
    mockDecode.mockReturnValue(new ArrayBuffer(MAX_IMAGE_BYTES + 1))

    expect(() => decodePreparedImage(PREPARED)).toThrow(
      'Photo must be 10 MB or smaller.'
    )
  })
})
