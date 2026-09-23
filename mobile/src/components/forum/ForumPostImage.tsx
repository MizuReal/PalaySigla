// Forum photo — resolves the storage path's signed URL and renders it through
// the shared Photo fallback, so a missing/broken object reads honestly.
import type { StyleProp, ViewStyle } from 'react-native'
import Photo from '../Photo'
import useForumImageUrl from '../../hooks/useForumImageUrl'
import type { ForumImageRef } from '../../types/domain'

interface ForumPostImageProps {
  image: ForumImageRef
  alt: string
  style?: StyleProp<ViewStyle>
}

function ForumPostImage({ image, alt, style }: ForumPostImageProps) {
  const { url, isLoading } = useForumImageUrl(image.storage_path)

  return (
    <Photo
      uri={url}
      alt={alt}
      fallbackLabel={alt}
      loading={isLoading}
      style={style}
    />
  )
}

export default ForumPostImage
