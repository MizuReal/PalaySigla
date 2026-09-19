// Photo pipeline for marketplace uploads — the mobile port of
// website/src/utils/image.ts. The picker hands back a local file; validation
// checks the JPEG/PNG whitelist, compression re-encodes to a bounded JPEG
// (which strips EXIF/GPS metadata), and the upload reads the compressed bytes
// back. Unlike the web build, the 10 MB cap applies to the re-encoded upload
// payload: AGENTS.md requires capturing at the sensor's maximum resolution and
// compressing client-side, so a large original is compressed rather than
// rejected.
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png']

const MAX_IMAGE_DIMENSION = 1600
const JPEG_QUALITY = 0.82

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
    })
    return { uri: result.uri, width: result.width, height: result.height }
  } catch {
    throw new Error('Could not process the photo.')
  }
}

export async function readPreparedImageBytes(image: PreparedImage): Promise<ArrayBuffer> {
  let bytes: ArrayBuffer
  try {
    const response = await fetch(image.uri)
    bytes = await response.arrayBuffer()
  } catch {
    throw new Error('Could not read the photo. Please try again.')
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error('Photo must be 10 MB or smaller.')
  }
  return bytes
}
