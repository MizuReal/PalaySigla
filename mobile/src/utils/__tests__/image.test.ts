/// <reference types="jest" />
const mockResize = jest.fn()
const mockRenderAsync = jest.fn()
const mockSaveAsync = jest.fn()
const mockManipulate = jest.fn()

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: (...args: unknown[]) => mockManipulate(...args),
  },
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
}))

import {
  compressImage,
  MAX_IMAGE_BYTES,
  readPreparedImageBytes,
  validateImageAsset,
} from '../image'
import type { PickedImageAsset } from '../image'

const ASSET: PickedImageAsset = {
  uri: 'file:///camera/original.jpg',
  width: 800,
  height: 600,
  mimeType: 'image/jpeg',
  fileSize: 2_000_000,
}

function jsonResponse(bytes: ArrayBuffer): Response {
  return { arrayBuffer: async () => bytes } as unknown as Response
}

beforeEach(() => {
  mockResize.mockReset()
  mockRenderAsync.mockReset()
  mockSaveAsync.mockReset()
  mockManipulate.mockReset()

  mockManipulate.mockReturnValue({ resize: mockResize, renderAsync: mockRenderAsync })
  mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync })
  mockSaveAsync.mockResolvedValue({
    uri: 'file:///cache/prepared.jpg',
    width: 1600,
    height: 1200,
  })
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
    expect(
      validateImageAsset({ ...ASSET, fileSize: MAX_IMAGE_BYTES * 3 })
    ).toBe('')
  })
})

describe('compressImage', () => {
  it('downscales a large landscape photo on its long edge and re-encodes as JPEG', async () => {
    mockSaveAsync.mockResolvedValue({
      uri: 'file:///cache/prepared.jpg',
      width: 1600,
      height: 1067,
    })

    await expect(
      compressImage({ ...ASSET, width: 3000, height: 2000 })
    ).resolves.toEqual({
      uri: 'file:///cache/prepared.jpg',
      width: 1600,
      height: 1067,
    })

    expect(mockManipulate).toHaveBeenCalledWith(ASSET.uri)
    expect(mockResize).toHaveBeenCalledWith({ width: 1600, height: null })
    expect(mockSaveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.82 })
  })

  it('downscales a large portrait photo on its long edge', async () => {
    await compressImage({ ...ASSET, width: 2000, height: 3000 })

    expect(mockResize).toHaveBeenCalledWith({ width: null, height: 1600 })
  })

  it('re-encodes without resizing when the photo already fits', async () => {
    await compressImage(ASSET)

    expect(mockResize).not.toHaveBeenCalled()
    expect(mockSaveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.82 })
  })

  it('reports processing failures', async () => {
    mockSaveAsync.mockRejectedValue(new Error('native failure'))

    await expect(compressImage(ASSET)).rejects.toThrow('Could not process the photo.')
  })
})

describe('readPreparedImageBytes', () => {
  it('reads the prepared file into an ArrayBuffer', async () => {
    const bytes = new ArrayBuffer(1024)
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(bytes))

    await expect(
      readPreparedImageBytes({ uri: 'file:///cache/prepared.jpg', width: 1, height: 1 })
    ).resolves.toBe(bytes)

    expect(fetchMock).toHaveBeenCalledWith('file:///cache/prepared.jpg')
  })

  it('reports file read failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    await expect(
      readPreparedImageBytes({ uri: 'file:///cache/prepared.jpg', width: 1, height: 1 })
    ).rejects.toThrow('Could not read the photo. Please try again.')
  })

  it('rejects payloads over the 10 MB cap', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(new ArrayBuffer(MAX_IMAGE_BYTES + 1)))

    await expect(
      readPreparedImageBytes({ uri: 'file:///cache/prepared.jpg', width: 1, height: 1 })
    ).rejects.toThrow('Photo must be 10 MB or smaller.')
  })
})
