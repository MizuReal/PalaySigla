import { useEffect, useState } from 'react'
import Photo from '../Photo'
import { getForumImageUrl } from '../../services/forum'
import type { ForumImageRef } from '../../types/domain'

interface ForumPostImageProps {
  image: ForumImageRef
  alt: string
  aspectClass: string
  className?: string
  loading?: 'eager' | 'lazy'
}

function ForumPostImage({
  image,
  alt,
  aspectClass,
  className = '',
  loading = 'lazy',
}: ForumPostImageProps) {
  const [imageUrl, setImageUrl] = useState('')

  useEffect(() => {
    let isCurrent = true
    const loadImage = async () => {
      try {
        const url = await getForumImageUrl(image.storage_path)
        if (isCurrent) {
          setImageUrl(url)
        }
      } catch {
        // the Photo fallback covers a failed signed URL
      }
    }
    loadImage()
    return () => {
      isCurrent = false
    }
  }, [image.storage_path])

  return (
    <Photo
      src={imageUrl}
      alt={alt}
      fallbackLabel={alt}
      aspectClass={aspectClass}
      className={className}
      loading={loading}
    />
  )
}

export default ForumPostImage
