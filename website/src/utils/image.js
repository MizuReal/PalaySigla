export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png']

const MAX_IMAGE_DIMENSION = 1600
const JPEG_QUALITY = 0.82

export function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a JPEG or PNG photo.'
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Photo must be 10 MB or smaller.'
  }
  return ''
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not read the photo.'))
    image.src = url
  })
}

export async function compressImage(file) {
  const image = await loadImage(file)
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
  // canvas re-encoding strips EXIF/GPS metadata from the original
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not compress the photo.'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
  return blob
}
