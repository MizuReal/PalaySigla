// Photo pipeline for marketplace uploads — the mobile port of
// website/src/utils/image.ts. The picker hands back a local file; validation
// checks the JPEG/PNG whitelist, compression re-encodes to a bounded JPEG
// (which strips EXIF/GPS metadata) and returns its base64 payload. React
// Native cannot reliably read a local file for upload, so the bytes are
// decoded from that base64 (the method Supabase's storage-js documents for
// React Native) rather than fetched. Unlike the web build, the 10 MB cap
// applies to the re-encoded upload payload: AGENTS.md requires capturing at
// the sensor's maximum resolution and compressing client-side, so a large
// original is compressed rather than rejected.
import { decode } from 'base64-arraybuffer'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png']

const MAX_IMAGE_DIMENSION = 1600
const JPEG_QUALITY = 0.82
const PROCESS_FAILED_MESSAGE = 'Could not process the photo.'
const EMPTY_IMAGE_MESSAGE = 'The photo could not be read. Please choose it again.'

export interface PickedImageAsset {
  uri: string
  width: number
  height: number
  mimeType?: string
  fileSize?: number
}

export interface PreparedImage {
  uri: string
  width: number
  height: number
  base64: string
}

export function validateImageAsset(asset: PickedImageAsset): string {
  if (asset.mimeType && !ACCEPTED_IMAGE_TYPES.includes(asset.mimeType)) {
    return 'Please choose a JPEG or PNG photo.'
  }
  return ''
}

export async function compressImage(asset: PickedImageAsset): Promise<PreparedImage> {
  const longEdge = Math.max(asset.width, asset.height)
  try {
    const context = ImageManipulator.manipulate(asset.uri)
    if (longEdge > MAX_IMAGE_DIMENSION) {
      if (asset.width >= asset.height) {
        context.resize({ width: MAX_IMAGE_DIMENSION, height: null })
      } else {
        context.resize({ width: null, height: MAX_IMAGE_DIMENSION })
      }
    }
    const rendered = await context.renderAsync()
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
      base64: true,
    })
    if (!result.base64) {
      throw new Error(PROCESS_FAILED_MESSAGE)
    }
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      base64: result.base64,
    }
  } catch {
    throw new Error(PROCESS_FAILED_MESSAGE)
  }
}

export function decodePreparedImage(image: PreparedImage): ArrayBuffer {
  const bytes = decode(image.base64)
  if (bytes.byteLength === 0) {
    throw new Error(EMPTY_IMAGE_MESSAGE)
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Photo must be 10 MB or smaller.')
  }
  return bytes
}

